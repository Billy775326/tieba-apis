import fs from "node:fs";
const report = JSON.parse(
  fs.readFileSync("evidence/request-models.json", "utf8"),
);
const lines = [
  "# 贴吧 Android 请求模型字段",
  "",
  `APK SHA-256：\`${report.artifact.sha256}\`。`,
  "",
  "以下字段直接来自 DEX 的 `com.squareup.wire.ProtoField` 注解。tag 和显式类型是静态观察；类型注解省略时保留 Java 描述符，不推断默认值。接口与模型的对应关系仍需反编译调用点验证，必填参数、默认值、签名及响应尚未确认。",
  "",
];
for (const model of report.models) {
  lines.push(
    `## ${model.descriptor}`,
    "",
    `来源：${model.dex}，class_def 索引 ${model.class_def_index}。`,
    "",
    "| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |",
    "| --- | --- | --- | --- |",
  );
  const fields = model.fields
    .map((field) => ({
      field,
      annotation: field.annotations.find(
        (a) => a.type === "Lcom/squareup/wire/ProtoField;",
      ),
    }))
    .filter((x) => x.annotation)
    .sort(
      (a, b) =>
        a.annotation.elements.tag.raw_unsigned -
        b.annotation.elements.tag.raw_unsigned,
    );
  for (const { field, annotation } of fields) {
    const e = annotation.elements;
    lines.push(
      `| ${field.name} | ${e.tag.raw_unsigned} | ${e.type?.name ?? field.type} | ${e.label?.name ?? "未显式声明"} |`,
    );
  }
  lines.push("");
}
fs.writeFileSync("docs/request-fields.md", lines.join("\n").trimEnd() + "\n");
