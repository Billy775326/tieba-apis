import fs from "node:fs";
const report = JSON.parse(
  fs.readFileSync("evidence/request-models.json", "utf8"),
);
const lines = [
  "# 贴吧 Android 请求模型字段",
  "",
  "> 历史 App 字段表：这里是固定 APK 首批模型的 Wire 元数据，不是 PC 参数手册。当前网页契约见 [PC API](api.md#pc-已验收请求契约) 和 [基础功能](pc-web-basic-functions.md)；全 APK Wire 范围见 [网络清单](network-inventory.md)。",
  "",
  `APK SHA-256：\`${report.artifact.sha256}\`。`,
  "",
  "本表覆盖首批 11 个请求模型、345 个带 Wire 注解的字段，不是全量接口参数手册。字段直接来自 DEX 的 `com.squareup.wire.ProtoField` 注解；tag 和显式类型属于静态观察，省略类型时保留 Java 描述符，不推断默认值或必填性。已完成的请求链路和线上核对见 [首批功能验证](validation.md)，更大范围的协议线索与未完成项见 [全量覆盖报告](full-coverage.md) 和 [扩展协议契约](../evidence/protocol-contracts.json)。已恢复部分遗留 JSON 签名，不能因此推断所有接口的签名要求。",
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
