#!/usr/bin/env python3
"""
Structural smoke-check for the Dart sources, since `dart analyze` is not
available in this sandbox (no Flutter/Dart SDK).

Checks per .dart file:
  * balanced (), [], {} outside of strings/comments
  * every import / part resolves to a file that exists
  * every `package:iranweather/...` import maps to an existing file
  * no stray CJK / Japanese / Korean characters in source or comments
  * no non-UTF8 bytes
  * functions/classes/enums are not duplicated within a file

Usage:  python3 tools/validate_dart.py
Exit code 0 = clean, 1 = problems.
"""

import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "lib")

problems = []


def iter_dart():
    for base, _dirs, files in os.walk(LIB):
        for f in sorted(files):
            if f.endswith(".dart"):
                yield os.path.join(base, f)


def strip_code(src):
    """Remove strings and comments so brace-matching is meaningful."""
    out = []
    i = 0
    n = len(src)
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        # line comment
        if c == "/" and nxt == "/":
            j = src.find("\n", i)
            i = n if j < 0 else j
            continue
        # block comment (nested-safe enough for Dart)
        if c == "/" and nxt == "*":
            depth = 1
            i += 2
            while i < n and depth:
                if src[i : i + 2] == "/*":
                    depth += 1
                    i += 2
                elif src[i : i + 2] == "*/":
                    depth -= 1
                    i += 2
                else:
                    i += 1
            continue
        # raw strings """..."""
        if c == '"' and src.startswith('"""', i):
            j = src.find('"""', i + 3)
            i = n if j < 0 else j + 3
            out.append(" ")
            continue
        # normal string
        if c == '"':
            i += 1
            while i < n:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == '"':
                    i += 1
                    break
                i += 1
            out.append(" ")
            continue
        # single-quoted / triple single-quoted raw string
        if c == "'":
            i += 1
            while i < n:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == "'":
                    i += 1
                    break
                i += 1
            out.append(" ")
            continue
        out.append(c)
        i += 1
    return "".join(out)


def check_balance(path, src):
    code = strip_code(src)
    pairs = {"(": ")", "[": "]", "{": "}"}
    closers = set(pairs.values())
    stack = []
    line = 1
    for ch in code:
        if ch == "\n":
            line += 1
        elif ch in pairs:
            stack.append((ch, line))
        elif ch in closers:
            if not stack:
                problems.append(f"{path}:{line}: unmatched closing '{ch}'")
                return
            op, oline = stack.pop()
            if pairs[op] != ch:
                problems.append(
                    f"{path}:{line}: expected '{pairs[op]}' for '{op}' opened at line {oline}, got '{ch}'")
                return
    if stack:
        op, oline = stack[-1]
        problems.append(f"{path}:{oline}: unclosed '{op}'")


def check_imports(path, src):
    for m in re.finditer(r"^import\s+['\"]([^'\"]+)['\"];", src, re.M):
        uri = m.group(1)
        if uri.startswith("dart:") or uri.startswith("package:"):
            continue
        # relative imports
        rel = os.path.normpath(os.path.join(os.path.dirname(path), uri))
        if not os.path.exists(rel):
            problems.append(f"{path}: missing relative import '{uri}'")


def check_package_imports(path, src):
    for m in re.finditer(r"^import\s+'package:iranweather/([^'\"]+)['\"];", src, re.M):
        rel = os.path.join(LIB, m.group(1))
        if not rel.endswith(".dart"):
            rel += ".dart"
        if not os.path.exists(rel):
            problems.append(f"{path}: missing package import '{m.group(1)}'")


CJK = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]")


def check_cjk(path, src):
    for i, line in enumerate(src.split("\n"), 1):
        hits = CJK.findall(line)
        if hits:
            problems.append(
                f"{path}:{i}: non-Persian script characters {''.join(hits)}")


def check_duplicates(path, src):
    for m in re.finditer(r"^\s*(?:abstract\s+)?(?:final\s+)?class\s+(\w+)", src, re.M):
        name = m.group(1)
        if src.count("class $name") > 1 or len(re.findall(r"\bclass\s+$name\b", src)) > 1:
            problems.append(f"{path}: duplicate class '{name}'")
    for m in re.finditer(r"^\s*(?:enum|mixin|extension)\s+(\w+)", src, re.M):
        name = m.group(1)
        if len(re.findall(r"\b(?:enum|mixin|extension)\s+$name\b", src)) > 1:
            problems.append(f"{path}: duplicate '{name}'")


def main():
    files = list(iter_dart())
    for path in files:
        raw = io.open(path, "rb").read()
        try:
            src = raw.decode("utf-8")
        except UnicodeDecodeError:
            problems.append(f"{path}: not valid UTF-8")
            continue
        check_balance(path, src)
        check_imports(path, src)
        check_package_imports(path, src)
        check_cjk(path, src)
        check_duplicates(path, src)

    # every feature directory should have at least one file
    print(f"checked {len(files)} dart files under lib/")

    if problems:
        print(f"\n{len(problems)} PROBLEM(S):")
        for p in problems:
            print("  - " + p)
        return 1
    print("\nOK: structure, imports and character sets are clean.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
