# 核心代码导读

## 为什么公开这些代码

小满的技术价值不只是浏览器自动化或模型调用，还包括指标定义、数据来源归一化、任务状态管理和失败处理。为了让技术面试官能直接检查关键思路，公开仓库提供了三组无第三方依赖的最小示例。

这些文件是根据项目真实模块和设计约束重新整理的教学示例，不是生产源码的逐行复制。运行数据均为合成数据；没有公开公司接口、真实业务值、账号标识、Cookie 或密钥。

## 1. 指标模型：先定义口径，再接收数值

文件：[`metric-validation.js`](../examples/metric-model/metric-validation.js)

关键点：

- 每个指标有稳定 `id`、来源、单位、值类型和定义版本。
- 指标值必须符合定义的类型，例如订单量必须是安全整数，比例必须是有限数值。
- 缺失值与非法值使用显式状态表示，不把它们伪装成 `0`。
- 结果保留原始值、展示值、复制值和 Snapshot 引用，便于复核。
- 结果对象被冻结，避免历史结果在后续流程中被静默改写。

生产项目对应的主要模块：`browser-audit-extension/v2-model.js`、`browser-audit-extension/v2-metric-registry.js`。

## 2. 数据归一化：不同来源，统一结果结构

文件：[`normalize-source.js`](../examples/data-normalization/normalize-source.js)

关键点：

- 每个来源通过 Adapter 声明字段映射和单位规则。
- 不同来源的字段名可以不同，但输出统一为 `status / value / unit / error`。
- 金额单位转换必须显式声明，避免把分、元混用。
- `missing`、`invalid` 等异常状态保留下来，不用默认值掩盖采集问题。
- 只保留必要的来源身份和字段证据，不持久化整份原始响应。

生产项目对应的主要模块：`browser-audit-extension/v2-qianchuan-normalizer.js`、`browser-audit-extension/v2-compass-normalizer.js`，以及各自的数据源解析核心。

## 3. Run 生命周期：让多来源任务可恢复、可验收

文件：[`run-lifecicle.js`](../examples/workflow/run-lifecycle.js) 和 [`run-lifecycle.test.js`](../examples/workflow/run-lifecycle.test.js)

关键点：

- `Run` 表示一次逻辑任务，`Snapshot` 表示某个来源的采集结果。
- 一个来源完成后先 checkpoint，另一个来源失败时仍能保留已完成来源的结果。
- 相同 checkpoint 重复提交不会重复写入；不同内容试图覆盖已接受 checkpoint 会被拒绝。
- 所有来源都进入终态后，Run 才能进入 `success / partial / failed`。
- `partial` 明确表达部分来源成功，避免把“任务结束”误报成“全部成功”。

生产项目还使用 IndexedDB 事务、capture-owner lock、来源身份轮换和 cleanup；为了让示例保持短小，这些浏览器存储与并发细节没有在内存版示例中模拟。对应生产模块主要是 `browser-audit-extension/v2-store.js`、`browser-audit-extension/v2-scheduler.js`。

## 运行与验证

在仓库根目录执行：

```bash
node examples/metric-model/metric-validation.js
node examples/data-normalization/normalize-source.js
node examples/workflow/run-lifecycle.test.js
```

前两个命令输出合成输入的归一化结果；第三个命令执行断言，验证 checkpoint 幂等、覆盖冲突拦截和部分成功终态。

## 公开范围与技术边界

公开示例用于展示数据建模、确定性校验和任务状态设计。生产浏览器扩展的完整采集实现、平台适配细节、原始测试夹具和业务数据仍不在公开仓库中。若需要核验生产代码，可在获得项目授权后查看私有 POC 仓库。
