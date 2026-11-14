"""Read every APK entry without executing or extracting it; output is private JSONL."""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

MAX_ENTRY = 128 * 1024 * 1024
MAX_TOTAL = 1024 * 1024 * 1024
URL = re.compile(rb"(?:https?|wss?)://[^\x00-\x20\x7f-\xff\"'<>\\{}]{1,2048}")
UTF16_LE = re.compile(rb"(?:[\x20-\x7e]\x00){8,}")
UTF16_BE = re.compile(rb"(?:\x00[\x20-\x7e]){8,}")

def scan(apk, evidence, output):
    expected = json.loads(Path(evidence).read_text(encoding='utf-8-sig'))['artifact']
    with open(apk, 'rb') as source:
        actual = hashlib.file_digest(source, 'sha256').hexdigest()
    if actual != expected['sha256']:
        raise ValueError('APK provenance mismatch')
    entries = []
    total = 0
    matches = 0
    with zipfile.ZipFile(apk) as archive, open(output, 'w', encoding='utf-8', newline='\n') as out:
        def emit(value):
            out.write(json.dumps(value, ensure_ascii=True, separators=(',', ':')) + '\n')
        emit({'type': 'artifact', 'artifact': expected})
        for info in archive.infolist():
            if info.is_dir():
                continue
            if info.file_size > MAX_ENTRY or total + info.file_size > MAX_TOTAL:
                raise ValueError('Archive scan limit exceeded; no complete result')
            data = archive.read(info)  # ZipFile checks CRC; never executes target content.
            total += len(data)
            digest = hashlib.sha256(data).hexdigest()
            count = 0
            for match in URL.finditer(data):
                emit({'type': 'literal', 'entry': info.filename, 'entry_sha256': digest,
                      'offset': match.start(), 'encoding': 'ascii', 'value': match[0].decode('ascii', errors='replace')})
                count += 1
            for pattern, codec in [(UTF16_LE, 'utf-16le'), (UTF16_BE, 'utf-16be')]:
                for run in pattern.finditer(data):
                    text = run[0].decode(codec).encode('ascii')
                    for match in URL.finditer(text):
                        emit({'type': 'literal', 'entry': info.filename, 'entry_sha256': digest,
                              'offset': run.start() + 2 * match.start(), 'encoding': codec, 'value': match[0].decode('ascii')})
                        count += 1
            entries.append({'entry': info.filename, 'bytes': len(data), 'sha256': digest, 'url_occurrences': count})
            matches += count
        emit({'type': 'manifest', 'entries': entries, 'entry_count': len(entries),
              'total_uncompressed_bytes': total, 'url_occurrences': matches, 'complete_within_limits': True})
    print(json.dumps({'entries': len(entries), 'bytes': total, 'url_occurrences': matches}))

if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit('Usage: python scripts/scan-apk-strings.py APK ENDPOINT_EVIDENCE PRIVATE_OUTPUT_JSONL')
    scan(*sys.argv[1:])
