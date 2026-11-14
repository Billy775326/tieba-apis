import java.io.*;
import java.nio.file.*;
import java.util.*;
import com.google.gson.*;
import jadx.api.*;
import jadx.core.dex.nodes.*;
import jadx.core.dex.instructions.*;
import jadx.core.dex.instructions.args.*;
class IndexEndpointReferences {
  static Long literal(InsnArg arg, Map<Integer,Long> registers) {
    if(arg instanceof LiteralArg value)return value.getLiteral();
    if(arg instanceof RegisterArg value)return registers.get(value.getRegNum());
    return null;
  }
  public static void main(String[] args) throws Exception {
    JsonObject candidates=JsonParser.parseString(Files.readString(Path.of(args[1]))).getAsJsonObject();
    String actual=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(Path.of(args[0]))));
    if(!actual.equals(candidates.getAsJsonObject("artifact").get("sha256").getAsString()))throw new IllegalArgumentException("APK identity mismatch");
    Map<String,List<Object>> references=new LinkedHashMap<>();
    Map<Long,Set<String>> routes=new TreeMap<>();List<Map<String,Object>> requests=new ArrayList<>();
    for(JsonElement entry:candidates.getAsJsonArray("candidates")) references.put(entry.getAsJsonObject().get("value").getAsString(),new ArrayList<>());
    JadxArgs options=new JadxArgs(); options.setInputFile(new File(args[0]));options.setThreadsCount(1);options.setSkipResources(true);
    int classes=0,methods=0,withoutCode=0;List<Object> failures=new ArrayList<>();
    try(JadxDecompiler decompiler=new JadxDecompiler(options)) {
      decompiler.load();
      for(JavaClass javaClass:decompiler.getClassesWithInners()) {
        ClassNode cls=javaClass.getClassNode();classes++;
        for(MethodNode method:cls.getMethods()) {
          methods++;
          try {
            method.load();InsnNode[] code=method.getInstructions();if(code==null){withoutCode++;continue;}
            List<String> strings=new ArrayList<>();List<Map<String,Object>> hits=new ArrayList<>();
            Map<Integer,Long> registers=new HashMap<>();String lastPath=null;List<Long> requestCommands=new ArrayList<>();
            for(int offset=0;offset<code.length;offset++) {
              InsnNode insn=code[offset];if(insn==null)continue;
              if(insn instanceof ConstStringNode value){String valueString=value.getString();if(strings.size()<80)strings.add(valueString);if(references.containsKey(valueString)){hits.add(Map.of("literal",valueString,"offset",offset));lastPath=valueString;}}
              if(insn instanceof InvokeNode invoke&&invoke.getCallMth().isConstructor()&&invoke.getArgsCount()>=2){
                String owner=invoke.getCallMth().getDeclClass().getFullName();Long cmd=literal(invoke.getArg(1),registers);
                if(cmd!=null){if(owner.endsWith(".TbHttpMessageTask")){if(lastPath!=null)routes.computeIfAbsent(cmd,k->new TreeSet<>()).add(lastPath);lastPath=null;}else if(owner.equals("com.baidu.adp.framework.message.HttpMessage"))requestCommands.add(cmd);}
              }
              RegisterArg result=insn.getResult();if(result!=null){Long value=null;if((insn.getType()==InsnType.CONST||insn.getType()==InsnType.MOVE)&&insn.getArgsCount()==1)value=literal(insn.getArg(0),registers);if(value==null)registers.remove(result.getRegNum());else registers.put(result.getRegNum(),value);}
              if(insn.getType()==InsnType.IF||insn.getType()==InsnType.GOTO||insn.getType()==InsnType.SWITCH){registers.clear();lastPath=null;}
            }
            // Route associations use the nearest preceding endpoint literal; never cross a branch boundary.
            for(Long command:requestCommands)requests.add(Map.of("http_command",command,"class_name",javaClass.getFullName(),"method",method.getName(),"method_signature",method.toString(),"same_method_string_literals",strings));
            for(Map<String,Object> hit:hits){String literal=(String)hit.get("literal");references.get(literal).add(Map.of("class_name",javaClass.getFullName(),"method",method.getName(),"method_signature",method.toString(),"instruction_code_unit_offset",hit.get("offset"),"same_method_string_literals",strings));}
          }catch(Exception e){failures.add(Map.of("class_name",javaClass.getFullName(),"method",method.getName(),"error",e.getClass().getSimpleName()));}
          finally{method.unload();}
        }
        if(classes%5000==0)System.out.println("Examined classes: "+classes+"; methods: "+methods);
      }
    }
    Map<String,Object> report=new LinkedHashMap<>();report.put("artifact_sha256",candidates.getAsJsonObject("artifact").get("sha256").getAsString());report.put("method","Direct decoded CONST_STR instruction references; no target execution; same-method strings are clues, not proof of parameter semantics; HTTP route associations use the nearest preceding path literal within a branch-free segment, not full string dataflow");report.put("classes_examined",classes);report.put("methods_examined",methods);report.put("methods_without_code",withoutCode);report.put("failures",failures);report.put("references",references);report.put("http_routes",routes);report.put("http_requests",requests);Files.writeString(Path.of(args[2]),new Gson().toJson(report));System.out.println("Referenced candidates: "+references.values().stream().filter(v->!v.isEmpty()).count()+"; failures: "+failures.size());
  }
}
