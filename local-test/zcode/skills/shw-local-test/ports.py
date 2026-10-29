#!/usr/bin/env python3
"""Mac-local port registry. No dependencies, credentials, containers or process killing."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import socket
import sys
import tempfile
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone


def fail(message):
    raise ValueError(message)


def name(value):
    if not re.fullmatch(r'[a-z][a-z0-9-]{0,63}', value):
        fail('Identifiers require lowercase letters, digits and hyphens')
    return value


def available(port):
    # Wildcard probes cover loopback and LAN listeners, including IPv6.
    for family, address in [(socket.AF_INET, '0.0.0.0'), (socket.AF_INET6, '::')]:
        with socket.socket(family, socket.SOCK_STREAM) as sock:
            if family == socket.AF_INET6:
                sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
            try:
                sock.bind((address, port))
            except OSError:
                return False
    return True


@contextmanager
def registry(root):
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    if root.is_symlink() or not root.is_dir() or root.stat().st_uid != os.getuid() or root.stat().st_mode & 0o077:
        fail('Registry must be an owned ordinary directory')
    lock = root / 'registry.lock'
    fd = os.open(lock, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'r+') as handle:
        if os.fstat(handle.fileno()).st_uid != os.getuid() or os.fstat(handle.fileno()).st_mode & 0o077:
            fail('Registry lock owner differs')
        fcntl.flock(handle, fcntl.LOCK_EX)
        path = root / 'registry.json'
        if path.is_symlink():
            fail('Registry symlink refused')
        if path.exists() and (not path.is_file() or path.stat().st_uid != os.getuid() or path.stat().st_mode & 0o077):
            fail('Registry ownership or permissions differ; preserve and inspect')
        data = json.loads(path.read_text()) if path.exists() else {'version': 1, 'host': socket.gethostname(), 'projects': {}}
        if data.get('version') != 1 or data.get('host') != socket.gethostname() or not isinstance(data.get('projects'), dict):
            fail('Unknown registry version or host; preserve and inspect')
        used = set()
        for key, project in data['projects'].items():
            name(key)
            if not isinstance(project, dict) or not isinstance(project.get('repository'), str) or not Path(project['repository']).is_absolute() or not isinstance(project.get('ports'), dict) or not isinstance(project.get('leases'), dict):
                fail('Malformed registry project; preserve and inspect')
            for resource, port in project['ports'].items():
                name(resource)
                if type(port) is not int or not 1024 <= port <= 65535 or port in used:
                    fail('Malformed or overlapping registered ports; preserve and inspect')
                used.add(port)
            for suite, lease in project['leases'].items():
                name(suite)
                if not isinstance(lease, dict) or not all(isinstance(lease.get(k), str) for k in ['token', 'worktree', 'sha', 'started']):
                    fail('Malformed lease; preserve and inspect')
        before = json.dumps(data, sort_keys=True)
        yield data
        if json.dumps(data, sort_keys=True) != before:
            fd, temp = tempfile.mkstemp(prefix='.registry-', dir=root)
            try:
                with os.fdopen(fd, 'w') as output:
                    json.dump(data, output, indent=2)
                    output.write('\n')
                    output.flush()
                    os.fsync(output.fileno())
                os.replace(temp, path)
            finally:
                if os.path.exists(temp):
                    os.unlink(temp)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--registry', type=Path, default=Path.home() / 'Library/Application Support/shw-local-test')
    sub = parser.add_subparsers(dest='action', required=True)
    sub.add_parser('list')
    reserve = sub.add_parser('reserve')
    reserve.add_argument('--project', type=name, required=True)
    reserve.add_argument('--repository', type=Path, required=True)
    reserve.add_argument('--port', action='append', default=[], help='resource=port (exact import)')
    reserve.add_argument('--resource', action='append', default=[], type=name, help='resource to allocate')
    reserve.add_argument('--start', type=int, default=20000)
    reserve.add_argument('--end', type=int, default=49999)
    for verb in ['check', 'unregister', 'acquire', 'release']:
        p = sub.add_parser(verb)
        p.add_argument('--project', type=name, required=True)
        if verb in ['acquire', 'release']:
            p.add_argument('--suite', type=name, required=True)
        if verb == 'acquire':
            p.add_argument('--worktree', type=Path, required=True)
            p.add_argument('--sha', required=True)
        if verb == 'release':
            p.add_argument('--token', required=True)
    args = parser.parse_args()
    if sys.platform != 'darwin':
        fail('This plugin runs only on the dedicated Mac test host')
    if not args.registry.is_absolute():
        fail('Registry path must be absolute')
    with registry(args.registry) as data:
        projects = data['projects']
        if args.action == 'list':
            # Lease tokens stay private to acquire/release callers.
            result = {key: {**value, 'leases': {suite: {k: v for k, v in lease.items() if k != 'token'} for suite, lease in value['leases'].items()}} for key, value in projects.items()}
        elif args.action == 'reserve':
            repo = str(args.repository.resolve(strict=True))
            existing = projects.get(args.project)
            if existing and existing['repository'] != repo:
                fail('Project identity already belongs to another repository')
            if existing and existing['leases']:
                fail('Release active suite leases before changing ports')
            requested = {}
            for item in args.port:
                key, value = item.split('=', 1)
                name(key)
                if key in requested:
                    fail('Duplicate resource')
                requested[key] = int(value)
            if not requested and not args.resource:
                fail('Choose exact ports or resources')
            used = {port for key, value in projects.items() if key != args.project for port in value['ports'].values()}
            ports = dict(existing['ports']) if existing else {}
            if not 1024 <= args.start <= args.end <= 65535:
                fail('Invalid allocation range')
            for key, port in requested.items():
                if not 1024 <= port <= 65535 or port in used:
                    fail('Invalid port or cross-project registration conflict')
                if ports.get(key) != port and not available(port):
                    fail('Requested port is already listening')
                ports[key] = port
            for key in args.resource:
                if key in requested:
                    fail('Resource appears in exact and automatic selection')
                if key in ports:
                    continue
                port = next((p for p in range(args.start, args.end + 1) if p not in used and p not in ports.values() and available(p)), None)
                if port is None:
                    fail('No available port in range')
                ports[key] = port
            if len(set(ports.values())) != len(ports):
                fail('Resources cannot share a host port')
            projects[args.project] = {'repository': repo, 'ports': ports, 'leases': {}}
            result = projects[args.project]
        else:
            project = projects.get(args.project)
            if project is None:
                fail('Project is not registered')
            if args.action == 'check':
                result = {'ports': project['ports'], 'busy': {key: port for key, port in project['ports'].items() if not available(port)}}
            elif args.action == 'unregister':
                if project['leases'] or any(not available(p) for p in project['ports'].values()):
                    fail('Active lease or listener; stop owned services first')
                del projects[args.project]
                result = {'unregistered': args.project}
            elif args.action == 'acquire':
                if args.suite in project['leases']:
                    fail('Suite already leased; never expire or steal automatically')
                if not re.fullmatch(r'[a-f0-9]{40,64}', args.sha):
                    fail('Require exact source SHA')
                worktree = args.worktree.resolve(strict=True)
                import subprocess
                head = subprocess.check_output(['git', '-C', str(worktree), 'rev-parse', 'HEAD'], text=True).strip()
                common = subprocess.check_output(['git', '-C', str(worktree), 'rev-parse', '--path-format=absolute', '--git-common-dir'], text=True).strip()
                registered = subprocess.check_output(['git', '-C', project['repository'], 'rev-parse', '--path-format=absolute', '--git-common-dir'], text=True).strip()
                dirty = subprocess.check_output(['git', '-C', str(worktree), 'status', '--porcelain'], text=True).strip()
                if head != args.sha or dirty or Path(common).resolve() != Path(registered).resolve():
                    fail('Source changed, dirty checkout or different repository')
                lease = {'token': str(uuid.uuid4()), 'worktree': str(worktree), 'sha': args.sha, 'started': datetime.now(timezone.utc).isoformat()}
                project['leases'][args.suite] = lease
                result = lease
            elif args.action == 'release':
                lease = project['leases'].get(args.suite)
                if not lease or lease['token'] != args.token:
                    fail('Lease token mismatch; preserve state')
                del project['leases'][args.suite]
                result = {'released': args.suite}
    print(json.dumps(result, indent=2))
    if args.action == 'check' and result['busy']:
        return 2
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
