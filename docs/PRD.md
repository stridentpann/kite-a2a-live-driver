# 06 · A2A 在线一致性测试驱动

PRD 1.0 · 2026-10-18 · 协议测试基础设施 · 条件满足后立项  
状态：设计提案，未实现/未付款/未提交。先读[总体接入设计](../总体接入设计.md)与[接口事件约定](../接口与事件约定.md)。

## 1. 用户与真实场景

**用户：**实现 Kite Coordination Extension 的协议开发者和运行方。

**第一次使用：**一个 Runtime 能完成一次正常交易，但开发者需要证明它也会拒绝错误身份、旧 revision 和非法重放，且不会写入错误状态。

**问题：**官方离线向量可以验证签名和文档，不能验证真实 Runtime 的状态与并发；官方在线驱动明确仍未实现。

**Kite 接入价值：**已确认的公开发布缺口。交付的是驱动真实状态机的测试工具；无 Runtime 环境时只能做到离线开发，不宣称在线合规。

## 2. MVP 范围

**P0，首版必须完成：**

- 按固定 transitions.json 生成测试计划，不硬编码“永远 36 例”。
- 实现 formation、资金环境准备、delivery 的 fixture driver，建立每个测试要求的 from 状态。
- 覆盖 legal/illegal、actorBinding、concurrency、fundingDealIdentity；runtime observation 只能由实际运行方产生。
- 复用规范向量和既有 proof-chain 验证能力，产生每例请求、revision、回执和可核查证据。

**P1，有真实反馈后再做：**

- 增加第二个独立 Runtime/参与者验证及回归比较。
- 在运行方允许时补 deadline 场景的受控测试时钟；不能伪造线上时间。

**首版排除：**不重写 Coordination Engine，不提供主网自动交易，不把模拟 Runtime 结果当在线证据。

## 3. 完整用户流程

1. 固定协议 commit、Runtime 地址、角色身份及允许支出，先核验环境可用。
2. 建立 buyer/seller 等必要参与者；按规范协商并固定同一 termsHash。
3. 通过真实形成/资金/交付流程建立 fixture。
4. 发送合法、非法、过期 revision、相同重放和冲突重放请求。
5. 读取状态与 proof chain，验证既有签名、顺序和状态链接。
6. 严格报告未运行场景；清理可清理资源，资金处置由获批的真实流程完成。

## 4. Kite 能力接入

| 官方能力 | 接入方式 | 保存与验证 |
|---|---|---|
| 协议 | A2A Kite Coordination Extension 固定 schema/vectors | agreement、termsHash、角色与签名，按规范 wire 行为实现 |
| 运行 | 真实 Runtime 交互与回执 | expectedRevision、错误码、状态与资金观察 |
| 证据 | proofs 交互及离线校验 | 验证已捕获证明不等同驱动在线状态，报告必须分开 |

**接入前置：**所有涉及真实付款的路径先完成 G0，固定 network/asset/facilitator/CLI/账户环境；见总体接入设计。真实身份或 Runtime 不可得时明确 blocked，不能用 mock 替代。

**授权边界：**应用与业务权限自己验证；Passport 的 passkey 批准保留给真实用户；本轮 PRD 编制不发起任何授权或支付。协议实例、金额、会话和示例均以现场预检与实际输出为准。

## 5. 接口与数据

**拟提供接口：**独立拟提供 a2a-live-test plan/run/report；不要把官方现有 run.py --endpoint 误写成已可用。本驱动完成后才提供其自己的 --runtime 参数与角色配置。测试计划引用规范各类 case ID。

**核心对象：**ProtocolSnapshot、RuntimeProfile、ActorCredentialRef、Fixture、TransitionCase、CommandAttempt、Receipt、ProofCapture、CleanupRecord。

operation_id、付款证据、业务版本及产物按公共事件契约关联。接口/包名属于本项目设计，不代表官方已经发布同名能力。

## 6. 状态与恢复

ENV_BLOCKED/READY → FIXTURE_FORMING → STATE_READY → CASE_EXECUTING → EVIDENCE_CHECKED → CLEANUP；单例分 PASS/FAIL/BLOCKED/SKIP。真实 agreement 状态只从规范读取，不另写一套伪状态机。

- 无法建立 from 状态就 blocked；无权签某角色时不能用同一个测试密钥冒充所有角色。
- 不能通过客户端指令伪造 FUND_CONFIRMED 或 SETTLEMENT_OBSERVED。
- 并发、重放和失败 fixture 可能产生费用，测试前需允许列表与预算上限；异常停止后保留资产和清理记录。

任何付款未知均不能通过换 key 自动重买；任何产物恢复都需要原权限。测试桩中的假付款不产生真实交付承诺。

## 7. 开发任务拆分

- 06-T01：确认环境、角色、资产与外部参与权限；不可取得则暂停实现承诺。
- 06-T02：解析规范计划并接入既有离线检查。
- 06-T03：实现真实 formation/funding/delivery fixture。
- 06-T04：实现非法、身份和并发测试。
- 06-T05：形成严格报告、清理流程与可复现互通记录。

**投入粗估：**6–10 人周以上，不含环境开通。先做 M0 兼容与样本验证，再做独立核心、真实互通及发布；外部批准、环境开通和审核不计入可承诺工期。

## 8. 界面与使用体验

按协议类别展示用例、状态迁移、请求和 proof；不做协议营销分数。

在需要用户决定时展示价格、范围、权限和失败状态；普通产品页面不堆协议实现细节，技术证据留在诊断/报告页。

## 9. 验收与演示

下面是目标，尚未运行或达成。

- C01：固定 transitions.json 每项都有运行或明确阻塞结果，不遗漏分母。
- C02：真实捕获证明可用规范校验器验证，离线检查与在线执行分别报告。
- C03：相同请求重放、冲突重放、错误身份和旧 revision 有真实拒绝证据。
- C04：完整 conformance 声明只在所有规范场景实际执行且通过时给出；否则明确部分验证。

**完整演示：**对真实 Runtime 建立一项 fixture，发送合法操作及错误 actor/旧 revision，对照状态和签名回执；展示未能运行的其余场景。

**试用观察：**规范场景实际覆盖率、fixture 建立成本、可复现协议缺陷与跨实现一致性。

## 10. 提交与独立性

独立工具仓与生态登记可讨论；协议仓 README 当前说明开发在内部、外部 PR 不直接合并，应通过问题反馈等规定路径协作，不承诺直接向规范仓合并 PR。

项目核心包括本 PRD 定义的模型、业务引擎/状态/断言与样本；支付和基础依赖可正常共享，不复制其他参赛实现换名。EC 映射、活动审核与真实贡献是否被统计分别跟踪，不用本 PRD 保证收录。
