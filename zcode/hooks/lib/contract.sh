# contract.sh — 验证契约最小 YAML 解析器（bash 3.2 函数库，source 使用）
#
# 用途：解析 change 目录下扁平 schema 的 contract.yaml，并校验契约有效性。
#       仅支持这一种形状：固定键、标量单行、列表项为两空格缩进的单行字符串、
#       `#` 注释行（含行内尾注释）忽略。不做通用 YAML 解析（无嵌套/锚点/多行块）。
#
# 用法：
#   source "$(dirname "$0")/lib/contract.sh"
#   contract_parse /path/to/contract.yaml
#   if [ "$CONTRACT_VALID" = "true" ]; then ...; else ..."$CONTRACT_INVALID_REASON"; fi
#
# 导出变量（bash 3.2 无关联数组，全部普通变量 + 数组）：
#   CONTRACT_MODE             observe | enforce（必需）
#   CONTRACT_REJECT_PHRASING  A | B | C（缺省 A，enforce 拦截时生效）
#   CONTRACT_BLOCK_BUDGET     数字（缺省 3）
#   CONTRACT_TIMEOUT_SECS     数字（缺省 45）
#   CONTRACT_FROZEN           true | false（缺省 false）
#   CONTRACT_FROZEN_AT        字符串（缺省 ""）
#   CONTRACT_CMD_COUNT        验收命令条数
#   CONTRACT_CMDS             验收命令数组（索引 0..N-1）
#   CONTRACT_ARTIFACT_COUNT   期望产物条数
#   CONTRACT_ARTIFACTS        期望产物数组（索引 0..N-1）
#   CONTRACT_VALID            true | false
#   CONTRACT_INVALID_REASON   无效原因（VALID=false 时非空）
#
# 兼容性：bash 3.2（macOS 系统自带），不使用关联数组/mapfile/${var,,} 等 4+ 特性，
#         零外部依赖（注释剥离用到 POSIX sed，属基础工具集，非 jq/yq/python 类依赖）。

# 契约固定键：
#   acceptance_commands   必需，列表
#   expected_artifacts    可选，列表（缺省空）
#   mode                  必需，observe | enforce
#   reject_phrasing       可选，A | B | C
#   block_budget          可选，正整数
#   command_timeout_secs  可选，正整数
#   frozen                可选，true | false
#   frozen_at             可选，字符串时间戳

# ---- 内部辅助（下划线前缀，勿在库外使用）----

# 去除首尾空白（含 tab）
_contract_trim() {
    local s="$1"
    s="${s#"${s%%[![:space:]]*}"}"
    s="${s%"${s##*[![:space:]]}"}"
    printf '%s' "$s"
}

# 去除成对的首尾双引号（如 frozen_at: "" → 空）
_contract_strip_quotes() {
    local v="$1"
    case "$v" in
        \"*\") v="${v#\"}"; v="${v%\"}" ;;
    esac
    printf '%s' "$v"
}

# 是否为非负整数
_contract_is_uint() {
    case "$1" in
        ''|*[!0-9]*) return 1 ;;
    esac
    return 0
}

# ---- 对外接口 ----

# 清空全部解析结果并恢复缺省值（contract_parse 开头自动调用）
contract_clear() {
    CONTRACT_MODE=""
    CONTRACT_REJECT_PHRASING="A"
    CONTRACT_BLOCK_BUDGET="3"
    CONTRACT_TIMEOUT_SECS="45"
    CONTRACT_FROZEN="false"
    CONTRACT_FROZEN_AT=""
    CONTRACT_CMDS=()
    CONTRACT_ARTIFACTS=()
    CONTRACT_CMD_COUNT=0
    CONTRACT_ARTIFACT_COUNT=0
    CONTRACT_VALID="false"
    CONTRACT_INVALID_REASON=""
    _CONTRACT_HAS_CMD_KEY="false"
    return 0
}

# 解析并校验契约文件。
# 返回 0 且 CONTRACT_VALID=true 表示有效；返回 1（VALID=false）表示无效，
# 原因在 CONTRACT_INVALID_REASON。无效时导出变量保持已解析到的部分值。
contract_parse() {
    local file="$1"
    contract_clear

    if [ ! -f "$file" ]; then
        CONTRACT_INVALID_REASON="契约文件不存在或不可读: $file"
        return 1
    fi

    local line stripped key rest item section
    section=""   # 当前列表收集中的键名（acceptance_commands / expected_artifacts），空表示无

    while IFS= read -r line || [ -n "$line" ]; do
        # 剥离注释：整行注释（行首 #）与行内尾注释（空白后 #，如 "mode: enforce  # xx"）
        # sed 不可用时保留原行（命令替换退出码非 0），宁可多留字符也不丢内容
        if stripped=$(printf '%s\n' "$line" | sed -e 's/^[[:space:]]*#.*$//' -e 's/[[:space:]]#.*$//' 2>/dev/null); then
            line="$stripped"
        fi
        line=$(_contract_trim "$line")
        [ -n "$line" ] || continue

        # 列表项："- xxx"（两空格缩进在 trim 后即为该形状；宽松接受任意缩进）
        case "$line" in
            -*\ *)
                item=$(_contract_trim "${line#-}")
                [ -n "$item" ] || continue
                if [ "$section" = "acceptance_commands" ]; then
                    CONTRACT_CMDS[$CONTRACT_CMD_COUNT]="$item"
                    CONTRACT_CMD_COUNT=$((CONTRACT_CMD_COUNT + 1))
                elif [ "$section" = "expected_artifacts" ]; then
                    CONTRACT_ARTIFACTS[$CONTRACT_ARTIFACT_COUNT]="$item"
                    CONTRACT_ARTIFACT_COUNT=$((CONTRACT_ARTIFACT_COUNT + 1))
                fi
                # 不在任何列表键下的杂行：忽略
                continue
                ;;
        esac

        # 键行：必须含冒号才进一步处理
        case "$line" in
            *:*) ;;
            *) continue ;;
        esac
        key=$(_contract_trim "${line%%:*}")
        rest=$(_contract_trim "${line#*:}")

        case "$key" in
            acceptance_commands)
                # 列表键：本键独占一行（行内值形式不支持，忽略 rest）
                section="acceptance_commands"
                _CONTRACT_HAS_CMD_KEY="true"
                ;;
            expected_artifacts)
                section="expected_artifacts"
                ;;
            mode)
                section=""
                CONTRACT_MODE=$(_contract_strip_quotes "$rest")
                ;;
            reject_phrasing)
                section=""
                CONTRACT_REJECT_PHRASING=$(_contract_strip_quotes "$rest")
                ;;
            block_budget)
                section=""
                CONTRACT_BLOCK_BUDGET=$(_contract_strip_quotes "$rest")
                ;;
            command_timeout_secs)
                section=""
                CONTRACT_TIMEOUT_SECS=$(_contract_strip_quotes "$rest")
                ;;
            frozen)
                section=""
                CONTRACT_FROZEN=$(_contract_strip_quotes "$rest")
                ;;
            frozen_at)
                section=""
                CONTRACT_FROZEN_AT=$(_contract_strip_quotes "$rest")
                ;;
            *)
                # 未知键：忽略（schema 前向兼容）
                section=""
                ;;
        esac
    done < "$file"

    # ---- 有效性校验（必需字段 + 值域）----
    if [ "$_CONTRACT_HAS_CMD_KEY" != "true" ]; then
        CONTRACT_INVALID_REASON="缺少必需字段 acceptance_commands"
        return 1
    fi
    if [ -z "$CONTRACT_MODE" ]; then
        CONTRACT_INVALID_REASON="缺少必需字段 mode"
        return 1
    fi
    case "$CONTRACT_MODE" in
        observe|enforce) ;;
        *)
            CONTRACT_INVALID_REASON="mode 值非法: ${CONTRACT_MODE}（应为 observe|enforce）"
            return 1
            ;;
    esac
    case "$CONTRACT_REJECT_PHRASING" in
        A|B|C) ;;
        *)
            CONTRACT_INVALID_REASON="reject_phrasing 值非法: ${CONTRACT_REJECT_PHRASING}（应为 A|B|C）"
            return 1
            ;;
    esac
    if ! _contract_is_uint "$CONTRACT_BLOCK_BUDGET"; then
        CONTRACT_INVALID_REASON="block_budget 值非法: ${CONTRACT_BLOCK_BUDGET}（应为非负整数）"
        return 1
    fi
    if ! _contract_is_uint "$CONTRACT_TIMEOUT_SECS"; then
        CONTRACT_INVALID_REASON="command_timeout_secs 值非法: ${CONTRACT_TIMEOUT_SECS}（应为非负整数）"
        return 1
    fi
    case "$CONTRACT_FROZEN" in
        true|false) ;;
        *) CONTRACT_FROZEN="false" ;;   # 宽松：非 true 一律按 false
    esac

    CONTRACT_VALID="true"
    return 0
}
