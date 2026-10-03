import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location("cloud_build", Path(__file__).with_name("build.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CloudBuildTests(unittest.TestCase):
    def test_workflows_preserved_and_local_runtime_excluded(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "cloud.zip"
            count = module.build(output)
            source_skills = list((module.ROOT / "codex/skills").glob("*/SKILL.md"))
            self.assertEqual(count, len(source_skills))
            with zipfile.ZipFile(output) as z:
                names = z.namelist()
                self.assertNotIn("shw-cloud/mcp.json", names)
                self.assertFalse(any("launch.cjs" in n or ".env" in n for n in names))
                manifest = json.loads(z.read("shw-cloud/plugin.json"))
                self.assertEqual(manifest["name"], "shw-cloud")
                self.assertNotIn("mcpServers", manifest)
                self.assertLessEqual(len(manifest["extensions"]["com.openai"]["interface"]["shortDescription"]), 30)
                for source in source_skills:
                    prefix = "shw-cloud/skills/" + source.parent.name + "/"
                    self.assertIn(prefix + "cloud-runtime.md", names)
                    original_body = source.read_text().split("\n---\n", 1)[1]
                    self.assertTrue(z.read(prefix + "SKILL.md").decode().endswith(original_body))
                for source in (module.ROOT / "codex/skills").rglob("*"):
                    if source.is_file() and source.name != "SKILL.md":
                        path = "shw-cloud/skills/" + str(source.relative_to(module.ROOT / "codex/skills"))
                        self.assertEqual(z.read(path), source.read_bytes())

    def test_remote_config_and_no_credential_packaging(self):
        with tempfile.TemporaryDirectory() as temp:
            config = Path(temp) / "connections.json"
            server = {"type": "streamable-http", "url": "https://mcp.example.test/mcp"}
            config.write_text(json.dumps({"mcpServers": {"gitea": server}}))
            output = Path(temp) / "remote.zip"
            module.build(output, config)
            with zipfile.ZipFile(output) as z:
                self.assertEqual(json.loads(z.read("shw-cloud/mcp.json"))["mcpServers"]["gitea"], server)
            for override in [
                {"headers": {"Authorization": "Bearer test-secret"}},
                {"url": "https://user:secret@example.test/mcp"},
                {"url": "http://example.test/mcp"},
                {"url": "https://localhost/mcp"},
                {"url": "https://example.test/mcp?token=secret"},
                {"url": "https://${GITEA_HOST}/mcp"},
                {"type": "stdio", "command": "node"},
            ]:
                with self.subTest(override=override):
                    config.write_text(json.dumps({"mcpServers": {"gitea": dict(server, **override)}}))
                    with self.assertRaises(ValueError):
                        module.connections(config)


if __name__ == "__main__":
    unittest.main()
