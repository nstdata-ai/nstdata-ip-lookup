# Nstdata IP Lookup

[English](README.md)

通过 Nstdata 查询 IP 信息的 Node.js 库与 CLI。无需 API Key，无运行时依赖。

| 功能 | 返回内容 |
|---|---|
| IPv4／IPv6 查询 | 可用的地域、网络及供应商分类字段。 |
| 当前 IP | 服务端观测到的本次请求地址。 |
| 可选内存缓存 | 每客户端独立、有容量上限的 TTL/LRU 缓存；仅缓存指定 IP，默认关闭。 |

## 运行要求

需要 Node.js 22.x 的 22.18+ 或 24.x，并确保 npm 在 PATH 中。

## CLI

### 无需项目直接运行

可从任意目录执行，无需先在项目中安装：

```sh
npx --yes --package @nstdata-ai/ip-lookup@1.0.0 nstdata-ip-lookup --ip 1.1.1.1
npx --yes --package @nstdata-ai/ip-lookup@1.0.0 nstdata-ip-lookup --current
```

查看用法或版本，不提交 IP 查询：

```sh
npx --yes --package @nstdata-ai/ip-lookup@1.0.0 nstdata-ip-lookup --help
npx --yes --package @nstdata-ai/ip-lookup@1.0.0 nstdata-ip-lookup --version
```

`npx` 可能下载软件包。CLI 的 `--help` 和 `--version` 不访问查询服务。

### 安装全局命令

需要在任意目录反复使用时：

```sh
npm install --global @nstdata-ai/ip-lookup
nstdata-ip-lookup --current
nstdata-ip-lookup --ip 2001:4860:4860::8888
```

查询成功输出 JSON。参数和退出码见[CLI 说明](docs/guide_zh.md#cli)。

## 库调用

在 Node.js 项目中安装：

```sh
npm install @nstdata-ai/ip-lookup
```

保存为 `lookup.mjs`：

```js
import { lookupIp, IpLookupError } from '@nstdata-ai/ip-lookup';

try {
    const result = await lookupIp('1.1.1.1');
    console.log(result.information);
} catch (error) {
    if (!(error instanceof IpLookupError)) throw error;
    console.error({ code: error.code });
    process.exitCode = 1;
}
```

```sh
node lookup.mjs
```

查询会访问 Nstdata。当前 IP 可能受代理或转发影响；地域及代理标记是供应商估计。代码的 MIT 许可不授予返回数据的使用权。

[使用指南](docs/guide_zh.md) · [贡献说明](CONTRIBUTING.md) · [变更记录](CHANGELOG.md) · [安全反馈](SECURITY.md) · [许可](LICENSE)
