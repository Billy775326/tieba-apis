import java.io.*;
import java.nio.file.*;
import java.util.*;
import com.google.gson.Gson;
import jadx.api.*;
import jadx.core.dex.nodes.*;
import jadx.core.dex.instructions.*;
import jadx.core.dex.instructions.args.*;

class IndexRequestCommands {
  static Long literal(InsnArg arg, Map<Integer,Long> registers) {
    if(arg instanceof LiteralArg value)return value.getLiteral();
    if(arg instanceof RegisterArg value)return registers.get(value.getRegNum());
    return null;
  }
  public static void main(String[] args) throws Exception {
    JadxArgs options=new JadxArgs(); options.setInputFile(new File(args[0])); options.setThreadsCount(1); options.setSkipResources(true);
    List<Object> rows=new ArrayList<>(); List<Object> failures=new ArrayList<>();int examined=0;
    try(JadxDecompiler decompiler=new JadxDecompiler(options)) {
      decompiler.load();
      for(JavaClass javaClass:decompiler.getClassesWithInners()) {
        ClassNode cls=javaClass.getClassNode();
        if(cls.getSuperClass()==null||!cls.getSuperClass().toString().equals("com.baidu.adp.framework.message.NetMessage"))continue;
        examined++;Set<String> models=new TreeSet<>();List<Object> commands=new ArrayList<>();
        for(MethodNode method:cls.getMethods()) {
          if(!method.isConstructor()&&!method.getName().equals("encode"))continue;
          try {
            method.load();Map<Integer,Long> registers=new HashMap<>();InsnNode[] code=method.getInstructions();if(code==null)continue;
            for(int offset=0;offset<code.length;offset++) {
              InsnNode insn=code[offset];if(insn==null)continue;
              if(insn.getType()==InsnType.NEW_INSTANCE && insn instanceof IndexInsnNode index) {
                String type=String.valueOf(index.getIndex());
                if(type.startsWith("tbclient.")&&(type.endsWith(".DataReq$Builder")||type.endsWith("ReqIdl$Builder")))models.add(type);
              }
              if(insn instanceof InvokeNode invoke&&invoke.getCallMth().isConstructor()&&invoke.getCallMth().getDeclClass().getFullName().equals("com.baidu.adp.framework.message.NetMessage")&&invoke.getArgsCount()>=3) {
                Long http=literal(invoke.getArg(1),registers),socket=literal(invoke.getArg(2),registers);
                if(socket!=null&&socket>=300000&&socket<=399999){Map<String,Object> record=new LinkedHashMap<>();record.put("method",method.toString());record.put("instruction_code_unit_offset",offset);record.put("http_command_literal",http);record.put("socket_command_literal",socket);commands.add(record);}
              }
              RegisterArg result=insn.getResult();
              if(result!=null){Long value=null;if((insn.getType()==InsnType.CONST||insn.getType()==InsnType.MOVE)&&insn.getArgsCount()==1)value=literal(insn.getArg(0),registers);if(value==null)registers.remove(result.getRegNum());else registers.put(result.getRegNum(),value);}
              // Do not propagate a register value across control-flow boundaries.
              if(insn.getType()==InsnType.IF||insn.getType()==InsnType.GOTO||insn.getType()==InsnType.SWITCH)registers.clear();
            }
          } catch(Exception error) {failures.add(Map.of("class_name",javaClass.getFullName(),"method",method.toString(),"error",error.toString()));}
          finally {method.unload();}
        }
        if(!models.isEmpty()||!commands.isEmpty())rows.add(Map.of("class_name",javaClass.getFullName(),"model_builder_types",models,"constructor_literals",commands));
      }
    }
    Map<String,Object> report=new LinkedHashMap<>();report.put("artifact_sha256", java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(Path.of(args[0])))));report.put("method","Direct JADX decoded-instruction indexing; no target code execution or REA Evidence claims");report.put("coverage","Only direct NetMessage subclasses; literals are not propagated through branches; mapping URL paths remains a separate step");report.put("examined_classes",examined);report.put("classes",rows);report.put("failures",failures);Files.writeString(Path.of(args[1]),new Gson().toJson(report));System.out.println("Indexed classes: "+rows.size()+"; failures: "+failures.size());
  }
}
