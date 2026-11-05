# 可运行代码示例

这些示例从小满数据自动化项目的真实设计中提炼，使用合成数据重新组织为可独立阅读和运行的最小代码。它们用于展示设计思路，不是生产仓库的完整源码，也不包含平台私有接口、真实业务数据或账号信息。

## 目录

| 示例 | 展示内容 | 运行命令 |
|---|---|---|
| `metric-model/metric-validation.js` | 指标定义、类型校验、格式化、不可变结果 | `node examples/metric-model/metric-validation.js` |
| `data-normalization/normalize-source.js` | 多来源字段映射、单位归一化、缺失 / 异常状态 | `node examples/data-normalization/normalize-source.js` |
| `workflow/run-lifecycle.js` | Run 状态、来源 checkpoint、幂等与结果冻结 | `node examples/workflow/run-lifecycle.test.js` |

要求：Node.js 18 或更高版本；无需安装第三方依赖。

## 阅读顺序

1. 先看指标模型，理解为什么指标需要稳定 ID、单位、类型和定义版本。
2. 再看数据归一化，理解为什么不同来源不能直接把原始数字混在一起。
3. 最后看 Run �'�doydj9�'��#9�!�)��i&��iy��:a��f�..�.�9.b:g :)�H�X���[�8� yn`��byd�9�#��k���9� x� ����'�.��k���9.+y�[�^Y�9.��b�x� X�\\�K[�ۙ\����:+��+�y���� z, �n��e��9�iy��9c�9o��m�."�/k9. 9�(yc���h�i#{�#9ak9o 9�.�/��.#y���.��k��.�8� �