import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.util.*;
import com.google.gson.*;
import jadx.api.*;
import jadx.core.dex.nodes.*;
import jadx.core.dex.instructions.*;
import jadx.core.dex.instructions.args.*;

class IndexNetworkCalls {
  static final Set<String> ROOTS=Set.of("com.baidu.tbadk.message.websockt.TbSocketMessage","com.baidu.adp.framework.message.SocketMessage","com.baidu.adp.framework.message.NetMessage","com.baidu.adp.framework.message.HttpMessage","com.baidu.android.imsdk.utils.BaseHttpRequest","com.baidu.android.imsdk.group.request.GroupBaseHttpRequest");
  static final Set<String> TARGETS=Set.of("com.baidu.tbadk.task.TbHttpMessageTask","com.baidu.tbadk.net.FastRequest","com.baidu.tieba.ybb","okhttp3.Request$Builder","okhttp3.Request.Builder");
  static String root(String name,Map<String,String> parents){Set<String> seen=new HashSet<>();while(name!=null&&seen.add(name)){if(ROOTS.contains(name))return name;name=parents.get(name);}return null;}
  static Long number(InsnArg a,Map<Integer,Long> values){return a instanceof LiteralArg l?l.getLiteral():a instanceof RegisterArg r?values.get(r.getRegNum()):null;}
  public static void main(String[] args)throws Exception{
    JsonObject input=JsonParser.parseString(Files.readString(Path.of(args[1]))).getAsJsonObject();String expected=input.getAsJsonObject("artifact").get("sha256").getAsString();String actual=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(Path.of(args[0]))));if(!actual.equals(expected))throw new IllegalArgumentException("APK provenance mismatch");
    Map<String,List<String>> literals=new HashMap<>();for(JsonElement e:input.getAsJsonArray("literals")){JsonObject o=e.getAsJsonObject();List<String> ids=new ArrayList<>();for(JsonElement id:o.getAsJsonArray("candidate_ids"))ids.add(id.getAsString());literals.put(o.get("value").getAsString(),ids);}
    JadxArgs options=new JadxArgs();options.setInputFile(new File(args[0]));options.setThreadsCount(1);options.setSkipResources(true);
    Gson gson=new Gson();int classes=0,methods=0,records=0,networkMethods=0,failures=0;Map<String,String> parents=new HashMap<>();
    try(JadxDecompiler d=new JadxDecompiler(options);BufferedWriter out=Files.newBufferedWriter(Path.of(args[2]))){d.load();for(JavaClass c:d.getClassesWithInners()){ClassNode n=c.getClassNode();if(n.getSuperClass()!=null)parents.put(c.getFullName(),n.getSuperClass().getObject());}
      out.write(gson.toJson(Map.of("type","artifact","artifact_sha256",actual)));out.newLine();
      for(JavaClass c:d.getClassesWithInners()){classes++;String base=root(c.getFullName(),parents);if(base==null&&c.getClassNode().getInterfaces().stream().anyMatch(t->t.toString().endsWith(".INetRequestData")))base="interface:INetRequestData";
        for(MethodNode m:c.getClassNode().getMethods()){methods++;try{m.load();InsnNode[] code=m.getInstructions();if(code==null)continue;List<Object> calls=new ArrayList<>(),hits=new ArrayList<>(),constants=new ArrayList<>();List<String> strings=new ArrayList<>(),models=new ArrayList<>(),urlFields=new ArrayList<>();Map<Integer,Long> values=new HashMap<>();Map<Integer,String> stringValues=new HashMap<>(),fieldValues=new HashMap<>();List<Object> parameterSites=new ArrayList<>(),urlSites=new ArrayList<>();
          for(int offset=0;offset<code.length;offset++){InsnNode insn=code[offset];if(insn==null)continue;
            if(insn instanceof ConstStringNode s){String value=s.getString();strings.add(value);if(literals.containsKey(value))hits.add(Map.of("candidate_ids",literals.get(value),"instruction_code_unit_offset",offset,"literal_sha256",HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)))));}
            if(insn instanceof IndexInsnNode index){String value=String.valueOf(index.getIndex());if(insn.getType()==InsnType.NEW_INSTANCE&&value.startsWith("tbclient.")&&value.endsWith("$Builder"))models.add(value);if(insn.getType()==InsnType.SGET&&value.matches("(?i).*(url|server|address|host|endpoint).*"))urlFields.add(value);}
            if(insn instanceof InvokeNode invoke){String owner=invoke.getCallMth().getDeclClass().getFullName();String networkRoot=root(owner,parents);String methodName=invoke.getCallMth().getName();
              boolean httpParam=Set.of("addParam","addParameter","putParam","addPostData","addQueryParameter","addFormDataPart").contains(methodName)||(owner.equals("com.baidu.tieba.ybb")&&methodName.equals("c"))||(owner.equals("com.baidu.tbadk.net.FastRequest")&&methodName.equals("t"));
              boolean jsonPut=owner.equals("org.json.JSONObject")&&methodName.equals("put");boolean mapPut=(owner.equals("java.util.Map")||owner.equals("java.util.HashMap"))&&methodName.equals("put");
              if((httpParam||jsonPut||mapPut)&&invoke.getArgsCount()>=3){InsnArg keyArg=invoke.getArg(1);String key=keyArg instanceof RegisterArg reg?stringValues.get(reg.getRegNum()):null;if(key!=null&&key.matches("[A-Za-z_][A-Za-z0-9_.-]{0,63}")&&!key.matches("[A-Fa-f0-9]{24,}"))parameterSites.add(Map.of("name",key,"owner",owner,"method",methodName,"kind",httpParam?"http-parameter-call":jsonPut?"json-object-put":"map-put","instruction_code_unit_offset",offset));}
              int urlArg=-1;String urlRole="endpoint";
              if(owner.endsWith(".TbHttpMessageTask")&&invoke.getCallMth().isConstructor())urlArg=2;
              else if(owner.equals("com.baidu.tbadk.net.FastRequest")&&invoke.getCallMth().isConstructor())urlArg=3;
              else if(owner.equals("com.baidu.tieba.ybb")&&(methodName.equals("S")||methodName.equals("E"))){urlArg=1;urlRole=methodName.equals("E")?"origin":"endpoint";}
              else if(Set.of("setUrl","setURL","url","setUri","uri").contains(methodName))urlArg=1;
              if(urlArg>=0&&urlArg<invoke.getArgsCount()&&invoke.getArg(urlArg) instanceof RegisterArg reg){String literal=stringValues.get(reg.getRegNum()),field=fieldValues.get(reg.getRegNum());Map<String,Object> site=new LinkedHashMap<>();site.put("owner",owner);site.put("method",methodName);site.put("role",urlRole);site.put("argument_index",urlArg);site.put("instruction_code_unit_offset",offset);if(literal!=null){site.put("literal_sha256",HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(literal.getBytes(java.nio.charset.StandardCharsets.UTF_8))));site.put("candidate_ids",literals.getOrDefault(literal,List.of()));}else if(field!=null)site.put("field_reference",field);else site.put("unresolved",true);urlSites.add(site);}
if(networkRoot!=null||TARGETS.contains(owner)){
              calls.add(Map.of("owner",owner,"method",invoke.getCallMth().getName(),"signature",invoke.getCallMth().toString(),"instruction_code_unit_offset",offset));
              if(invoke.getCallMth().isConstructor()&&networkRoot!=null){List<Object> argsKnown=new ArrayList<>();for(int a=1;a<invoke.getArgsCount();a++){Long v=number(invoke.getArg(a),values);if(v!=null)argsKnown.add(Map.of("argument_index",a,"literal",v));}if(!argsKnown.isEmpty())constants.add(Map.of("owner",owner,"instruction_code_unit_offset",offset,"arguments",argsKnown));}
            }}
            RegisterArg result=insn.getResult();if(result!=null){String stringValue=null,fieldValue=null;if(insn instanceof ConstStringNode str)stringValue=str.getString();else if(insn.getType()==InsnType.MOVE&&insn.getArgsCount()==1&&insn.getArg(0) instanceof RegisterArg reg){stringValue=stringValues.get(reg.getRegNum());fieldValue=fieldValues.get(reg.getRegNum());}else if(insn.getType()==InsnType.SGET&&insn instanceof IndexInsnNode idx)fieldValue=String.valueOf(idx.getIndex());if(stringValue==null)stringValues.remove(result.getRegNum());else stringValues.put(result.getRegNum(),stringValue);if(fieldValue==null)fieldValues.remove(result.getRegNum());else fieldValues.put(result.getRegNum(),fieldValue);Long value=null;if((insn.getType()==InsnType.CONST||insn.getType()==InsnType.MOVE)&&insn.getArgsCount()==1)value=number(insn.getArg(0),values);if(value==null)values.remove(result.getRegNum());else values.put(result.getRegNum(),value);}
            if(insn.getType()==InsnType.IF||insn.getType()==InsnType.GOTO||insn.getType()==InsnType.SWITCH){values.clear();stringValues.clear();fieldValues.clear();}
          }
          if(base!=null||!calls.isEmpty()||!hits.isEmpty()||!models.isEmpty()){Map<String,Object> row=new LinkedHashMap<>();row.put("type","method");row.put("class_name",c.getFullName());row.put("method",m.getName());row.put("signature",m.toString());row.put("network_class_root",base);row.put("network_calls",calls);row.put("candidate_hits",hits);row.put("string_literals",strings);row.put("constructor_literals",constants);row.put("model_builder_types",models);row.put("static_url_fields",urlFields);row.put("parameter_name_sites",parameterSites);row.put("url_argument_sites",urlSites);out.write(gson.toJson(row));out.newLine();records++;if(base!=null||!calls.isEmpty())networkMethods++;}
        }catch(Exception e){out.write(gson.toJson(Map.of("type","failure","class_name",c.getFullName(),"method",m.toString(),"error",e.getClass().getSimpleName())));out.newLine();failures++;}finally{m.unload();}}
        if(classes%10000==0){out.flush();System.out.println("Indexed classes: "+classes+"; methods: "+methods);}
      }
      out.write(gson.toJson(Map.of("type","summary","classes_examined",classes,"methods_examined",methods,"records",records,"network_methods",networkMethods,"failures",failures,"complete",failures==0)));out.newLine();
    }System.out.println("Completed classes="+classes+" methods="+methods+" records="+records+" networkMethods="+networkMethods+" failures="+failures);
  }
}
