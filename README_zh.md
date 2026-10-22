# Nstdata IP lookup

[English](README.md)

IPv4／IPv6 查询及请求出口 IP 的 CLI／库。无需 API Key，无运行时依赖；支持 Node.js 22 系列的 22.18+ 或 Node.js 24。

## 安装与运行

`1.0.0` 已本地准备、尚未发布；发布后使用以下命令安装：

```sh
npm install @nstdata-ai/ip-lookup@1.0.0
npx --no-install nstdata-ip-lookup --ip 1.1.1.1
npx --no-install nstdata-ip-lookup --ip 2001:4860:4860::8888
npx --no-install nstdata-ip-lookup --current
```

查询命令会发送真实请求。`--ip` 与 `--current` 二选一；`--help` 不联网，`--timeout` 单位为毫秒。退出码：0 成功、1 服务／网络失败、2 输入／配置错误。

`--current` 返回服务端观测到的 IP，可能受代理或转发影响。

## 库接口

```js
import { lookupIp } from '@nstdata-ai/ip-lookup';
const result = await lookupIp('1.1.1.1', { timeoutMs: 10000 });
// result.information.query is the returned IP; requestedIp retains the input.
```

选项：`baseURL` 默认 `https://api.nstdata.io`、`timeoutMs` 默认 10000、`maxResponseBytes` 默认 1048576，以及 `signal`、按次 `fetch`。CLI 支持超时和 `NSTDATA_IP_LOOKUP_BASE_URL`；自定义地址可带路径前缀，不允许凭据、查询或 fragment。自定义 fetch 必须遵守传入的 signal 和 `redirect: 'manual'`。

重复查询指定 IP 时，可使用带容量限制的可选内存缓存：

```js
import { createIpLookup } from '@nstdata-ai/ip-lookup';
const client = createIpLookup({ cacheTtlMs: 60000, maxCacheEntries: 100 });
const result = await client.lookup('1.1.1.1');
client.clearCache();
```

缓存默认关闭（`cacheTtlMs: 0`），仅在服务和数据使用条款允许留存时开启。TTL 为 0 至 2147483647 的整数毫秒，容量为正安全整数、默认 100。每个客户端独立保存缓存和固定请求选项，`lookup(ip, { signal })` 支持取消。仅缓存成功的指定 IP 查询，以输入原字符串为键；当前出口 IP 每次请求服务。过期结果不返回，失败不缓存，达到容量时淘汰最久未使用项。命中保留原取得时间，返回独立对象。不写文件、不设后台定时器、不跨客户端共享；`clearCache()` 清除已存条目，不取消进行中的请求。单次运行的 CLI 不缓存。

## 结果与限制

每次 GET `/api/v2/public/utility/ip-lookup`，指定 IP 时增加 `ipOrHost`。不自动重试或跳转。服务可能按调用方 IP 限流，多客户端可能共享限制；HTTP400 不自动归类为限流。

结果包含 `source`、`requestedIp` 和 `information`，保留可用的 IP、地理／时区／ISP／AS 字段及 mobile／proxy／hosting 标记。缺字段省略，null、false、0 保持原值。地理位置和代理标记为供应商判断，不代表身份或精确位置证明。

`retrievedAt` 是客户端读取并校验服务响应后的 UTC 时间，不是数据库更新时间。接口未提供数据源更新时间，故 `sourceUpdatedAt` 为 null；`cached` 表示是否命中本地缓存。数据由 Nstdata 提供，其后端实现使用 ip-api。包的 MIT 许可覆盖代码，不授予返回数据的使用权；商用、留存或再分发前应确认服务和数据使用条款。

期限覆盖请求和正文读取，体积上限针对解码正文，分块和解析副本另占内存。保持 TLS 验证；错误只暴露安全的代码／状态，不输出原始上游消息。无效 signal 在请求前返回 `INVALID_CONFIG`，非有限 API code 返回 `INVALID_RESPONSE`。展示返回字符串时按不可信数据处理。

## 开发

源码准备、本地归档安装及包检查见[贡献说明](CONTRIBUTING.md)。测试使用合成 fetch 和本机 HTTP；包检查验证安装后的公开导入、CLI 行为及导出类型。

[贡献说明](CONTRIBUTING.md) · [变更记录](CHANGELOG.md) · [MIT 许可](LICENSE)
