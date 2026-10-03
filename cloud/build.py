#!/usr/bin/env python3
"""Build a portable SHW cloud package without local launchers or credentials."""
import argparse
import json
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SERVICES = {"gitea", "kubernetes", "dbx"}


def connections(path):
    if path is None:
        return {}
    data = json.loads(path.read_text())
    if set(data) != {"mcpServers"}:
        raise ValueError("Expected only mcpServers")
    servers = data["mcpServers"]
    if not isinstance(servers, dict) or not servers or set(servers) - SERVICES:
        raise ValueError("Only gitea, kubernetes and dbx remote connections are supported")
    for name, server in servers.items():
        if set(server) != {"type", "url"} or server["type"] != "streamable-http":
            raise ValueError(f"{name}: use type and url only; authenticate in the host")
        url = urlsplit(server["url"])
        if url.scheme != "https" or not url.hostname or url.username or url.password or url.query or url.fragment:
            raise ValueError(f"{name}: expected a credential-free HTTPS MCP URL")
        if url.hostname in {"localhost", "127.0.0.1", "::1"} or any(c in server["url"] for c in "<>${}\\\n\r"):
            raise ValueError(f"{name}: local addresses and placeholders are not supported")
    return servers


def build(archive, config=None):
    servers = connections(config)
    source = ROOT / "codex"
    old = json.loads((source / ".codex-plugin/plugin.json").read_text())
    with tempfile.TemporaryDirectory(prefix="shw-cloud-") as temp:
        package = Path(temp) / "shw-cloud"
        package.mkdir()
        shutil.copytree(source / "skills", package / "skills")
        shutil.copyfile(ROOT / "LICENSE", package / "LICENSE")
        runtime = (ROOT / "cloud/runtime.md").read_text()
        count = 0
        for skill in sorted((package / "skills").glob("*/SKILL.md")):
            text = skill.read_text()
            match = re.match(r"\A---\n(.*?)\n---\n", text, re.S)
            if not match or not re.search(r"^name: " + re.escape(skill.parent.name) + r"$", match[1], re.M):
                raise ValueError(f"Invalid skill frontmatter: {skill.parent.name}")
            skill.write_text(text[:match.end()] + "\n## 云端运行前置\n\n执行前读取 [cloud-runtime.md](cloud-runtime.md)。本包不启动本地 MCP；涉及连接、工作区和客户端操作时，先按云端运行规则判断能力，再执行下方原工作流。\n\n" + text[match.end():])
            (skill.parent / "cloud-runtime.md").write_text(runtime)
            count += 1
        interface = dict(old["interface"])
        interface.update(displayName="SHW Cloud", shortDescription="SHW 产品开发与交付工作流", longDescription="SHW cloud workflow skills. Remote service access requires separately authenticated MCP connections; local launchers are excluded.")
        manifest = {
            "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
            "name": "shw-cloud", "version": old["version"],
            "description": "SHW cloud workflow skills with optional existing remote MCP connections.",
            "author": old["author"], "license": "MIT",
            "extensions": {"com.openai": {"interface": interface}},
        }
        assert len(interface["shortDescription"]) <= 30
        (package / "plugin.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        if servers:
            (package / "mcp.json").write_text(json.dumps({"$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", "mcpServers": servers}, indent=2) + "\n")
        revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
        (package / "build-info.json").write_text(json.dumps({"source_commit": revision, "source_version": old["version"], "skill_count": count, "declared_remote_services": sorted(servers), "live_connections_verified": False}, indent=2) + "\n")
        if any(p.is_symlink() for p in package.rglob("*")):
            raise ValueError("Symlinks cannot be packaged")
        archive.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
            for file in sorted(package.rglob("*")):
                if file.is_file():
                    z.write(file, file.relative_to(package.parent))
    return count


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--connections", type=Path, help="Verified remote endpoints only, no tokens")
    args = parser.parse_args()
    try:
        count = build(args.archive.resolve(), args.connections)
    except (ValueError, TypeError, KeyError) as error:
        parser.error(str(error))
    print(f"Built {count} workflow skills: {args.archive}")
