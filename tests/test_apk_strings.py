import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('apk_strings', ROOT / 'scripts' / 'scan-apk-strings.py')
scanner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scanner)

class ApkStringsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='tieba-apk-scan-')
        self.root = Path(self.tmp.name).resolve()
        self.assertEqual(self.root.parent, Path(tempfile.gettempdir()).resolve())
        self.addCleanup(self.safe_cleanup)
        self.apk = self.root / 'fixture.apk'
        self.evidence = self.root / 'evidence.json'
        self.output = self.root / 'private.jsonl'
    def safe_cleanup(self):
        self.assertEqual(self.root.parent, Path(tempfile.gettempdir()).resolve())
        self.assertTrue(self.root.name.startswith('tieba-apk-scan-'))
        self.tmp.cleanup()
    def bind(self):
        self.evidence.write_text(json.dumps({'artifact': {'filename': 'fixture.apk', 'size': self.apk.stat().st_size, 'sha256': hashlib.sha256(self.apk.read_bytes()).hexdigest()}}), encoding='utf-8')
    def test_all_entry_types_and_ascii_utf16_encodings(self):
        with zipfile.ZipFile(self.apk, 'w') as archive:
            archive.writestr('assets/test.js', b'https://example.com/api/read\x00')
            archive.writestr('lib/x86/test.so', 'https://example.com/native/read'.encode('utf-16le') + b'\x00\x00')
            archive.writestr('resources.arsc', 'https://example.com/wide/read'.encode('utf-16be') + b'\x00\x00')
        self.bind()
        scanner.scan(str(self.apk), str(self.evidence), str(self.output))
        rows = [json.loads(x) for x in self.output.read_text(encoding='utf-8').splitlines()]
        manifest = rows[-1]
        self.assertTrue(manifest['complete_within_limits'])
        self.assertEqual(manifest['entry_count'], 3)
        values = {r['value'] for r in rows if r['type'] == 'literal'}
        self.assertTrue({'https://example.com/api/read', 'https://example.com/native/read', 'https://example.com/wide/read'}.issubset(values))
    def test_mismatched_artifact_never_creates_a_complete_report(self):
        with zipfile.ZipFile(self.apk, 'w') as archive:
            archive.writestr('asset', b'fixture')
        self.bind()
        self.apk.write_bytes(self.apk.read_bytes() + b'changed')
        with self.assertRaisesRegex(ValueError, 'provenance'):
            scanner.scan(str(self.apk), str(self.evidence), str(self.output))
        self.assertFalse(self.output.exists())
    def test_limit_failure_has_no_complete_manifest(self):
        with zipfile.ZipFile(self.apk, 'w') as archive:
            archive.writestr('asset', b'long fixture')
        self.bind()
        old = scanner.MAX_ENTRY
        try:
            scanner.MAX_ENTRY = 2
            with self.assertRaisesRegex(ValueError, 'limit'):
                scanner.scan(str(self.apk), str(self.evidence), str(self.output))
        finally:
            scanner.MAX_ENTRY = old
        self.assertNotIn('"type":"manifest"', self.output.read_text(encoding='utf-8'))
    def test_corrupt_entry_crc_is_rejected(self):
        with zipfile.ZipFile(self.apk, 'w', compression=zipfile.ZIP_STORED) as archive:
            archive.writestr('asset', b'original fixture')
        data = self.apk.read_bytes().replace(b'original fixture', b'corrupt! fixture')
        self.apk.write_bytes(data)
        self.bind()
        with self.assertRaises(zipfile.BadZipFile):
            scanner.scan(str(self.apk), str(self.evidence), str(self.output))

if __name__ == '__main__':
    unittest.main()
