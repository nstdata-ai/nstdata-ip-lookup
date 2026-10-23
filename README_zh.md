# Nstdata IP Lookup

[English](README.md)

通过 Nstdata 查询 IP 信息的 Node.js 库与 CLI。无需 API Key，无运行时依赖。

| 功能 | 返回内容 |
|---|---|
| IPv4／IPv6 查询 | 可用的地域、网络及供应商分类字段。 |
| 当前 IP | 服务端观测到的本次请求地址。 |
| 可选内存缓存 | 每客户端独立、有容量上限的 TTL/LRU 缓存；仅缓存指定 IP，默认关闭。 |

## 安装

需要 Node.js 22.x 的 22.18+ 或 24.x。版本 `1.0.0` 尚未发布。

```sh
npm install @nstdata-ai/ip-lookup@1.0.0
```

## CLI

```sh
npx --no-install nstdata-ip-lookup --ip 1.1.1.1
npx --no-install nstdata-ip-lookup --ip 2001:4860:4860::8888
npx --no-install nstdata-ip-lookup --current
```

查询成功输出 JSON。`--help` 不联网。参数和退出码见[CLI 说明](docs/guide_zh.md#cli)。

## 库调用

```js
import { lookupIp } from '@nstdata-ai/ip-lookup';

const result = await lookupIp('1.1.1.1');
console.log(result.information);
```

查询会访问 Nstdata。当前 IP 可能受代理或转发影响；地域及代理标记是供应商估计。代码的 MIT 许可不授予返回数据的使用权。

[使用指南](docs/guide_zh.md) · [贡献说明](CONTRIBUTING.md) · [变更记录](CHANGELOG.md) · [安全反馈](SECURITY.md) · [许可](LICENSE)
