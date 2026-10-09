# 项目配置归属

`.shw/project.yaml` 保留现有 `version: 1` 与 `mode`；可增加 [project.schema.json](project.schema.json) 的可选字段。[project.example.json](project.example.json) 是同结构示例，转换为 YAML 后填写项目已经核实的值，不是可直接部署的默认值。此 schema 是供 init/update 和项目校验器使用的结构契约；主 SHW 不通过一个配置文件取得远端权限，也不声称旧项目已自动迁移。

- `workspace.provider` 是能力偏好，不证明工具已安装或目录已占用；每次写入仍走工作区取证。`auto` 仅在已验证能力中选择，不能绕过失联占用。
- `repository` 标明实际 Gitea/GitHub；不把 Gitea API 参数原样发送 GitHub。按当前宿主可用工具映射相同的 Issue/PR/CI事实，任何写操作受授权限制并回读。
- `integration` 记录 dev→main 小批次或每日正常 merge 和实际合并责任。配置 `explicit-project-authorization` 必须有独立用户授权证据；配置本身不是授权。
- `release` 独立于集成；只能选择 tag 或明确审批触发。修改此字段不等于业务 CI/Fleet 已改，必须在该项目另行迁移实际触发器并验证。
- `deployment` 保存已核实目标、namespace、Deployment前缀、域名、Fleet 与镜像仓库映射。开发目标名称不自动等于 context 或 namespace；先核对登记再填。域名和资源前缀先查重，无法查询则标为未核实并停止依赖唯一性的部署动作。

组织通用默认值、工具链和组件包版本由项目架构入口索引；真实部署配置留项目 deploy/。敏感值不进入这里，不读取原始 kubeconfig/token；只记录凭据名称/用途。未知旧配置不静默删除，未知模式或冲突标记停止迁移并报告。

业务/权限/状态变化同步 PRD，接口/数据/架构变化同步技术文档，与实现同一变更交付。当前已实现规格与尚未落实方案显式分开。
