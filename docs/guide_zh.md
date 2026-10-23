# IP Lookup 使用指南

[English](guide.md) · [快速开始](../README_zh.md)

## 库接口

| 入口 | 行为 |
|---|---|
| `lookupIp(ip?, options?)` | 单次查询，不缓存；省略 `ip` 时查询服务端观测到的请求 IP。 |
| `createIpLookup(options?)` | 创建请求设置固定、可选进程内缓存的客户端。 |
| `client.lookup(ip?, { signal }?)` | 通过该客户端查询；当前 IP 始终绕过缓存。 |
| `client.clearCache()` | 清除已存条目，不取消进行中的请求。 |

输入为 literal IPv4 或 IPv6 地址，不接受 hostname、URL 或空字符串。选项须为非 null 对象；数组和原始类型值返回 `INVALID_CONFIG`。

## CLI

`--ip <address>` 与 `--current` 二选一。

| 参数 | 含义 |
|---|---|
| `--ip <IPv4-or-IPv6>` | 查询指定 IP。 |
| `--current` | 查询服务端观测到的地址，不一定是本机直接公网出口。 |
| `--timeout <milliseconds>` | 正整数毫秒期限，最大2147483647，默认10000。 |
| `--help`、`-h` | 输出用法，不发起查询。 |

成功向 stdout 输出一条 JSON 结果；失败向 stderr 输出 `{ "error": { "code": "…" } }`，并提供可用的 `statusCode`／`apiCode`。退出码：0成功、1服务／网络失败、2输入／配置错误。环境变量 `NSTDATA_IP_LOOKUP_BASE_URL` 可修改 CLI 的服务地址。

## 结果

| 字段 | 含义 |
|---|---|
| `source` | `nstdata-public-ip-lookup`：标识 Nstdata 接口，不标识下游数据集。 |
| `requestedIp` | 原始输入字符串；查询当前 IP 时为 `null`。 |
| `information.query` | 服务返回的有效 IP。 |
| `information` 可选字段 | 只保留响应中存在的字段；缺字段省略，`null`、`false`、`0` 保持原值。 |
| `retrievedAt` | 客户端读取并校验响应后的 UTC 时间；缓存命中时不更新。 |
| `sourceUpdatedAt` | `null`；接口未提供源数据更新时间。 |
| `cached` | 是否命中该客户端的本地缓存。 |

可选信息字段：

| 分组 | 字段 |
|---|---|
| 地域 | `continent`、`continentCode`、`country`、`countryCode`、`region`、`regionName`、`city`、`district`、`zip`、`lat`、`lon` |
| 时间 | `timezone`、`offset` |
| 网络 | `isp`、`org`、`as`、`asname`、`reverse` |
| 其他 | `currency`、`mobile`、`proxy`、`hosting` |

字符串、有限数值和布尔值按类型声明校验；可选字段均可为 `null`。未知字段不输出。代理标记缺失不代表 `false`；分类与近似地域不作为身份或精确位置证明。

## 请求配置

`lookupIp` 接受下列设置；`createIpLookup` 接受相同设置但不含 `signal`，取消信号传给各次 `client.lookup`。

| 设置 | 默认值／约束 |
|---|---|
| `baseURL` | `https://api.nstdata.io`；HTTP／HTTPS 地址，可带路径前缀，不含凭据、查询或片段。远程服务使用 HTTPS。 |
| `timeoutMs` |10000；1至2147483647的整数，覆盖请求及正文读取。 |
| `maxResponseBytes` |1048576；解码响应字节的正安全整数上限，分块存储与解析另占内存。 |
| `signal` | 可选 `AbortSignal`；请求前取消则不发请求。 |
| `fetch` | 原生 `fetch`；替换实现须遵守传入信号和 `redirect: 'manual'`。 |

每次请求为 `GET /api/v2/public/utility/ip-lookup`，指定 IP 时增加 `ipOrHost`。不自动重试或跟随跳转。调用方 IP 的限流可能由多个客户端共享；单凭 HTTP400 不能认定限流。HTTPS 保持 TLS 验证；本地取消不等于取消服务端处理。

## 可选缓存

仅在服务及数据使用条款允许留存时开启。

```js
import { createIpLookup } from '@nstdata-ai/ip-lookup';

const client = createIpLookup({ cacheTtlMs: 60000, maxCacheEntries: 100 });
const first = await client.lookup('1.1.1.1');
const second = await client.lookup('1.1.1.1');
console.log({ firstCached: first.cached, secondCached: second.cached });
client.clearCache();
```

| 设置 | 默认值／约束 |
|---|---|
| `cacheTtlMs` |0，关闭；0至2147483647的整数毫秒。 |
| `maxCacheEntries` |100；正安全整数。 |

仅缓存成功的指定 IP 查询，以输入原字符串为键；等价 IPv6 的不同写法可以各自占用条目。TTL 从校验后的结果入缓存时开始，使用单调时钟。过期条目不返回，失败不缓存；容量满时移除最久未使用条目。并发未命中各自请求，不合并请求。

每客户端独立保存缓存，返回对象与存储隔离，命中保留原取得时间。当前 IP 始终访问服务。不写文件、不使用全局共享缓存或后台定时器。CLI 不缓存。

## 错误与数据使用

捕获 `IpLookupError` 后检查 `code`，不依赖错误文字。

| 错误码 | 含义 |
|---|---|
| `INVALID_IP`、`INVALID_CONFIG` | 目标、客户端或调用设置不合法。 |
| `CANCELLED`、`TIMEOUT` | 调用方取消或客户端期限到达。 |
| `HTTP_ERROR` | HTTP状态失败，含跳转；查看 `statusCode`。 |
| `API_ERROR` | 服务外层包装报告失败；查看 `statusCode`、`apiCode`。 |
| `INVALID_RESPONSE` | UTF-8、JSON、外层包装、源状态或已知字段类型不合法。 |
| `RESPONSE_LIMIT` | 响应超过字节上限。 |
| `NETWORK_ERROR` | 连接或正文读取失败。 |

错误不包含原始响应正文或上游诊断。展示返回字符串时按不可信数据处理。数据覆盖及使用条件独立于代码的 MIT 许可；依赖返回数据前，须向服务提供方确认商用、留存和再分发条件。
