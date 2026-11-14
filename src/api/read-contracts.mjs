// Selected Wire fields from the pinned Tieba 22.13.1.1 APK; identifiers stay decimal strings.
const user={id:[2,'int64'],name:[3,'string'],name_show:[4,'string']};
const page={current_page:[3,'int32'],total_page:[5,'int32'],has_more:[6,'int32'],has_prev:[7,'int32']};
const forum={id:[1,'int64'],name:[2,'string']};
const content={type:[1,'uint32'],text:[2,'string'],link:[3,'string']};
const thread={id:[1,'int64'],title:[3,'string'],reply_num:[4,'int32'],author:[18,user],author_id:[56,'int64']};
const post={id:[1,'uint64'],title:[2,'string'],floor:[3,'uint32'],content:[5,content,true],sub_post_number:[13,'uint32'],author_id:[19,'int64'],author:[23,user]};
const subpost={id:[1,'uint64'],content:[2,content,true],author_id:[4,'int64'],floor:[6,'uint32'],author:[7,user]};
const searchForum={forum_id:[1,'int64'],forum_name:[2,'string']};
export const READ_METHODS=Object.freeze({
 getForumThreads:{path:'/c/f/frs/page',command:301001,commonTag:39,schema:{forum:[2,forum],page:[4,page],thread_list:[7,thread,true]}},
 getThread:{path:'/c/f/pb/page',command:302001,commonTag:25,schema:{forum:[2,forum],page:[3,page],post_list:[6,post,true],thread:[8,thread]}},
 getPostReplies:{path:'/c/f/pb/floor',command:302002,commonTag:9,schema:{page:[1,page],post:[3,post],subpost_list:[4,subpost,true]}},
 getUserProfile:{path:'/c/u/user/profile',command:303012,commonTag:9,schema:{user:[1,user]}},
 searchForums:{path:'/c/f/forum/searchPostForum',command:309466,commonTag:1,schema:{exact_match:[1,searchForum],fuzzy_match:[2,searchForum,true]}},
});
