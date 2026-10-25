import re
import sys


SERVER_IP = "13.62.168.145"


def parse_config(source):
    source = re.sub(r"(?m)#.*$", "", source)
    tokens = re.findall(
        r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|[{};]|[^\s{};]+',
        source,
    )
    index = 0

    def parse_block():
        nonlocal index
        entries = []
        while index < len(tokens):
            words = []
            while index < len(tokens) and tokens[index] not in {"{", "}", ";"}:
                words.append(tokens[index].strip("\"'"))
                index += 1
            if index >= len(tokens):
                break
            token = tokens[index]
            index += 1
            if token == "{":
                entries.append((words, parse_block()))
            elif token == ";":
                entries.append((words, None))
            else:
                break
        return entries

    return parse_block()


def walk(entries):
    for words, children in entries:
        if words and words[0] == "server" and children is not None:
            yield words, children
        if children is not None:
            yield from walk(children)


def directives(entries, name):
    return [
        words[1:]
        for words, children in entries
        if children is None and words and words[0] == name
    ]


def root_for_server(entries):
    roots = directives(entries, "root")
    if roots:
        return roots[-1][0] if roots[-1] else None

    for header, children in entries:
        if children is not None and header[:1] == ["location"] and header[1:2] == ["/"]:
            roots = directives(children, "root")
            if roots and roots[-1]:
                return roots[-1][0]
    return None


def main():
    config = sys.stdin.read()
    candidates = []
    for _, server in walk(parse_config(config)):
        names = [name for group in directives(server, "server_name") for name in group]
        listens = [value for group in directives(server, "listen") for value in group]
        exact_ip = SERVER_IP in names
        is_default = "default_server" in listens
        is_catch_all = "_" in names
        is_https = any("443" in value or value == "ssl" for value in listens)
        score = (100 if exact_ip else 50 if is_default else 10 if is_catch_all else 0)
        score += 20 if is_https else 0
        root = root_for_server(server)
        if score and root:
            candidates.append((score, root))

    if not candidates:
        raise SystemExit("Could not safely identify the Nginx root for the live portal.")

    root = max(candidates)[1]
    if not re.fullmatch(r"/[A-Za-z0-9_./-]+", root) or "/../" in root or root.endswith("/.."):
        raise SystemExit("The discovered Nginx root is not a safe absolute path.")

    print(f"::add-mask::{root}")
    print(f"root={root}")


if __name__ == "__main__":
    main()
