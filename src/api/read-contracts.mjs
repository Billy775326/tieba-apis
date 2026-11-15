// Selected Wire fields from the pinned Tieba 22.13.1.1 APK; identifiers stay decimal strings.
const user={id:[2,'int64'],name:[3,'string'],name_show:[4,'string'],has_concerned:[35,'int32'],is_fans:[91,'int32']};
const agree={agree_num:[1,'int64'],has_agree:[2,'int32'],agree_type:[3,'int32'],disagree_num:[4,'int64']};
const page={current_page:[3,'int32'],total_page:[5,'int32'],has_more:[6,'int32'],has_prev:[7,'int32']};
const forum={id:[1,'int64'],name:[2,'string']};
const content={type:[1,'uint32'],text:[2,'string'],link:[3,'string']};
const thread={id:[1,'int64'],title:[3,'string'],reply_num:[4,'int32'],author:[18,user],author_id:[56,'int64'],agree:[126,agree]};
const post={id:[1,'uint64'],title:[2,'string'],floor:[3,'uint32'],content:[5,content,true],sub_post_number:[13,'uint32'],author_id:[19,'int64'],author:[23,user],agree:[37,agree]};
const subpost={id:[1,'uint64'],content:[2,content,true],author_id:[4,'int64'],floor:[6,'uint32'],author:[7,user]};
const searchForum={forum_id:[1,'int64'],forum_name:[2,'string']};
const tail={tailId:[1,'uint32'],is_selected:[2,'uint32'],tailContent:[3,'string'],fontColor:[4,'string'],fontKeyName:[5,'string']};
const lbs={lat:[1,'string'],lng:[2,'string'],name:[3,'string'],sn:[4,'string'],distance:[5,'string']};
const notification={id:[7,'uint64'],type:[6,'int32'],time:[4,'uint32'],is_del:[5,'int32'],thread_info:[1,thread],agreeer:[8,user],post_info:[9,post]};
const popup={pop_key:[2,'string'],pop_value:[3,'string']};
const liveConfig={icon_url:[1,'string'],icon_scheme:[2,'string']};
export const READ_METHODS=Object.freeze({
 getLocationSuggestions:{path:'/c/s/getSuggestionByAddrName',command:303018,commonTag:2,schema:{poi_info:[1,lbs,true]}},
 getOwnTails:{path:'/c/u/tail/getTails',command:305001,commonTag:2,errorTag:2,dataTag:1,schema:{tailList:[1,tail,true],colorList:[2,'string',true],default_color:[3,'string']}},
 getAgreeNotifications:{path:'/c/u/feed/agreeme',command:309593,commonTag:1,schema:{has_more:[1,'int32'],agree_list:[2,notification,true]}},
 getOwnPrivacySettings:{path:'/c/u/user/getPrivateInfo',command:303016,commonTag:2,errorTag:2,dataTag:1,schema:{location:[1,'int32'],post:[2,'int32'],like:[3,'int32'],group:[4,'int32'],user:[5,{user_id:[1,'int64']}],live:[6,'int32'],forum_num:[7,'int32'],reply:[8,'int32'],follow:[11,'int32']}},
 getPollingStatus:{path:'/c/s/loop',command:309732,commonTag:1,schema:{live:[1,{normal_config:[1,liveConfig],is_end:[3,'string'],normal_config_list:[4,liveConfig,true]}],level:[2,popup],icon:[3,popup]}},
 getForumThreads:{path:'/c/f/frs/page',command:301001,commonTag:39,schema:{forum:[2,forum],page:[4,page],thread_list:[7,thread,true]}},
 getThread:{path:'/c/f/pb/page',command:302001,commonTag:25,schema:{forum:[2,forum],page:[3,page],post_list:[6,post,true],thread:[8,thread]}},
 getPostReplies:{path:'/c/f/pb/floor',command:302002,commonTag:9,schema:{page:[1,page],post:[3,post],subpost_list:[4,subpost,true]}},
 getUserProfile:{path:'/c/u/user/profile',command:303012,commonTag:9,schema:{user:[1,user]}},
 searchForums:{path:'/c/f/forum/searchPostForum',command:309466,commonTag:1,schema:{exact_match:[1,searchForum],fuzzy_match:[2,searchForum,true]}},
});
