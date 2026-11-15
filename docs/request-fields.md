# 贴吧 Android 请求模型字段

> 历史 App 字段表：这里是固定 APK 首批模型的 Wire 元数据，不是 PC 参数手册。当前网页契约见 [PC API](api.md#pc-已验收请求契约) 和 [基础功能](pc-web-basic-functions.md)；全 APK Wire 范围见 [网络清单](network-inventory.md)。

APK SHA-256：`06aa06e4579758e7fd33afe7d1a31a257c8ae6251965f3d8235b68cd965f2be3`。

本表覆盖首批 11 个请求模型、345 个带 Wire 注解的字段，不是全量接口参数手册。字段直接来自 DEX 的 `com.squareup.wire.ProtoField` 注解；tag 和显式类型属于静态观察，省略类型时保留 Java 描述符，不推断默认值或必填性。已完成的请求链路和线上核对见 [首批功能验证](validation.md)，更大范围的协议线索与未完成项见 [全量覆盖报告](full-coverage.md) 和 [扩展协议契约](../evidence/protocol-contracts.json)。已恢复部分遗留 JSON 签名，不能因此推断所有接口的签名要求。

## Ltbclient/CommonReq;

来源：classes5.dex，class_def 索引 2783。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| _client_type | 1 | INT32 | 未显式声明 |
| _client_version | 2 | STRING | 未显式声明 |
| _client_id | 3 | STRING | 未显式声明 |
| apid | 4 | STRING | 未显式声明 |
| _phone_imei | 5 | STRING | 未显式声明 |
| from | 6 | STRING | 未显式声明 |
| cuid | 7 | STRING | 未显式声明 |
| _timestamp | 8 | INT64 | 未显式声明 |
| model | 9 | STRING | 未显式声明 |
| BDUSS | 10 | STRING | 未显式声明 |
| tbs | 11 | STRING | 未显式声明 |
| net_type | 12 | INT32 | 未显式声明 |
| subapp_type | 13 | STRING | 未显式声明 |
| _phone_newimei | 14 | STRING | 未显式声明 |
| ka | 15 | STRING | 未显式声明 |
| m_api | 16 | STRING | 未显式声明 |
| m_logid | 17 | STRING | 未显式声明 |
| m_cost | 18 | STRING | 未显式声明 |
| m_result | 19 | STRING | 未显式声明 |
| m_size_u | 20 | STRING | 未显式声明 |
| m_size_d | 21 | STRING | 未显式声明 |
| smallflow | 22 | STRING | 未显式声明 |
| sign | 23 | STRING | 未显式声明 |
| pversion | 24 | STRING | 未显式声明 |
| _os_version | 25 | STRING | 未显式声明 |
| brand | 26 | STRING | 未显式声明 |
| brand_type | 27 | STRING | 未显式声明 |
| lego_lib_version | 28 | STRING | 未显式声明 |
| applist | 29 | STRING | 未显式声明 |
| stoken | 30 | STRING | 未显式声明 |
| z_id | 31 | STRING | 未显式声明 |
| cuid_galaxy2 | 32 | STRING | 未显式声明 |
| cuid_gid | 33 | STRING | 未显式声明 |
| oaid | 34 | STRING | 未显式声明 |
| c3_aid | 35 | STRING | 未显式声明 |
| sample_id | 36 | STRING | 未显式声明 |
| scr_w | 37 | INT32 | 未显式声明 |
| scr_h | 38 | INT32 | 未显式声明 |
| scr_dip | 39 | DOUBLE | 未显式声明 |
| q_type | 40 | INT32 | 未显式声明 |
| is_teenager | 41 | INT32 | 未显式声明 |
| sdk_ver | 42 | STRING | 未显式声明 |
| framework_ver | 43 | STRING | 未显式声明 |
| naws_game_ver | 44 | STRING | 未显式声明 |
| idfa | 45 | STRING | 未显式声明 |
| diac | 46 | STRING | 未显式声明 |
| active_timestamp | 49 | INT64 | 未显式声明 |
| first_install_time | 50 | INT64 | 未显式声明 |
| last_update_time | 51 | INT64 | 未显式声明 |
| event_day | 53 | STRING | 未显式声明 |
| android_id | 54 | STRING | 未显式声明 |
| cmode | 55 | INT32 | 未显式声明 |
| start_scheme | 56 | STRING | 未显式声明 |
| start_type | 57 | INT32 | 未显式声明 |
| shoubai_cuid | 58 | STRING | 未显式声明 |
| mac | 59 | STRING | 未显式声明 |
| idfv | 60 | STRING | 未显式声明 |
| extra | 61 | STRING | 未显式声明 |
| user_agent | 62 | STRING | 未显式声明 |
| personalized_rec_switch | 63 | INT32 | 未显式声明 |
| iemi | 64 | STRING | 未显式声明 |
| iemiwen | 65 | STRING | 未显式声明 |
| cam | 66 | STRING | 未显式声明 |
| afdi | 67 | STRING | 未显式声明 |
| di_diordna | 68 | STRING | 未显式声明 |
| vfdi | 69 | STRING | 未显式声明 |
| device_score | 70 | STRING | 未显式声明 |
| pure_mode | 71 | INT32 | 未显式声明 |
| xcx_mode | 72 | INT32 | 未显式声明 |
| ledom | 73 | STRING | 未显式声明 |
| diao | 74 | STRING | 未显式声明 |
| noisrev_so | 75 | STRING | 未显式声明 |
| dnarb | 76 | STRING | 未显式声明 |
| epyt_dnarb | 77 | STRING | 未显式声明 |
| w_rcs | 78 | STRING | 未显式声明 |
| h_rcs | 79 | STRING | 未显式声明 |
| pid_rcs | 80 | STRING | 未显式声明 |
| need_decrypt | 81 | INT32 | 未显式声明 |
| need_cam_decrypt | 82 | INT32 | 未显式声明 |
| shoubai_version | 83 | STRING | 未显式声明 |
| hm_acuid | 84 | STRING | 未显式声明 |
| hm_oid | 85 | STRING | 未显式声明 |
| hm_needmp | 86 | STRING | 未显式声明 |
| support_image | 87 | STRING | 未显式声明 |
| package_version | 88 | STRING | 未显式声明 |
| abtest_config_intervention | 89 | STRING | 未显式声明 |
| ad_context | 90 | STRING | 未显式声明 |
| view_path_info | 91 | STRING | 未显式声明 |
| device_tier | 92 | STRING | 未显式声明 |

## Ltbclient/FrsPage/DataReq;

来源：classes5.dex，class_def 索引 3665。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| kw | 1 | STRING | 未显式声明 |
| rn | 2 | INT32 | 未显式声明 |
| rn_need | 3 | INT32 | 未显式声明 |
| is_good | 4 | INT32 | 未显式声明 |
| cid | 5 | INT32 | 未显式声明 |
| withcal | 6 | INT32 | 未显式声明 |
| noval | 7 | INT32 | 未显式声明 |
| with_group | 8 | INT32 | 未显式声明 |
| need_badge | 9 | INT32 | 未显式声明 |
| frs_rn | 10 | INT32 | 未显式声明 |
| scr_w | 11 | INT32 | 未显式声明 |
| scr_h | 12 | INT32 | 未显式声明 |
| scr_dip | 13 | DOUBLE | 未显式声明 |
| q_type | 14 | INT32 | 未显式声明 |
| pn | 15 | INT32 | 未显式声明 |
| st_type | 16 | STRING | 未显式声明 |
| ctime | 17 | INT32 | 未显式声明 |
| data_size | 18 | INT32 | 未显式声明 |
| net_error | 19 | INT32 | 未显式声明 |
| check_login | 20 | BOOL | 未显式声明 |
| forum_name | 21 | STRING | 未显式声明 |
| result_num | 22 | INT32 | 未显式声明 |
| class_id | 23 | INT32 | 未显式声明 |
| ip_str | 24 | STRING | 未显式声明 |
| ip_int | 25 | INT32 | 未显式声明 |
| module_name | 26 | STRING | 未显式声明 |
| st_param | 27 | INT32 | 未显式声明 |
| smile_grade | 28 | INT32 | 未显式声明 |
| support_noun | 29 | BOOL | 未显式声明 |
| login | 30 | BOOL | 未显式声明 |
| user_id | 31 | INT64 | 未显式声明 |
| user_name | 32 | STRING | 未显式声明 |
| no_un | 33 | INT32 | 未显式声明 |
| portrait | 34 | STRING | 未显式声明 |
| mobile | 35 | STRING | 未显式声明 |
| email | 36 | STRING | 未显式声明 |
| debug | 37 | BOOL | 未显式声明 |
| cookie | 38 | STRING | 未显式声明 |
| common | 39 | Ltbclient/CommonReq; | 未显式声明 |
| lastids | 40 | STRING | 未显式声明 |
| issdk | 41 | INT32 | 未显式声明 |
| da_idfa | 42 | STRING | 未显式声明 |
| platform | 43 | STRING | 未显式声明 |
| category_id | 44 | INT32 | 未显式声明 |
| yuelaou_locate | 45 | STRING | 未显式声明 |
| yuelaou_params | 46 | STRING | 未显式声明 |
| sort_type | 47 | INT32 | 未显式声明 |
| last_click_tid | 48 | UINT64 | 未显式声明 |
| load_type | 49 | INT32 | 未显式声明 |
| app_pos | 50 | Ltbclient/AppPosInfo; | 未显式声明 |
| ad_param | 51 | Ltbclient/FrsPage/AdParam; | 未显式声明 |
| obj_locate | 52 | STRING | 未显式声明 |
| obj_source | 53 | STRING | 未显式声明 |
| call_url | 54 | STRING | 未显式声明 |
| is_selection | 55 | INT32 | 未显式声明 |
| call_from | 56 | INT32 | 未显式声明 |
| shoubai_cuid | 57 | STRING | 未显式声明 |
| hot_thread_id | 58 | INT64 | 未显式声明 |
| is_default_navtab | 59 | INT32 | 未显式声明 |
| ad_context_list | 60 | STRING | 未显式声明 |
| up_schema | 61 | STRING | 未显式声明 |
| ad_ext_params | 62 | STRING | 未显式声明 |
| default_sort_type | 63 | INT32 | 未显式声明 |
| app_transmit_data | 64 | Ltbclient/AppTransmitData; | 未显式声明 |
| ad_bear_context | 65 | STRING | 未显式声明 |
| has_ad_bear | 66 | INT32 | 未显式声明 |
| ad_bear_sid | 67 | STRING | 未显式声明 |
| ad_bear_sid_price | 68 | DOUBLE | 未显式声明 |
| request_times | 69 | INT32 | 未显式声明 |
| push_tid | 70 | INT64 | 未显式声明 |
| is_newfeed | 71 | INT32 | 未显式声明 |
| chatroom_new_msg | 72 | STRING | 未显式声明 |
| is_newfrs | 73 | INT32 | 未显式声明 |
| top_card_id | 74 | STRING | 未显式声明 |
| frs_tab_type_default | 75 | STRING | 未显式声明 |
| log_param | 76 | STRING | 未显式声明 |
| simplify_field | 77 | STRING | 未显式声明 |
| ad_external_info | 78 | STRING | 未显式声明 |
| thread_ids | 79 | STRING | 未显式声明 |
| forum_id | 80 | UINT64 | 未显式声明 |
| need_abstract | 81 | UINT32 | 未显式声明 |
| frs_common_info | 82 | STRING | 未显式声明 |
| is_goodtab | 83 | INT32 | 未显式声明 |
| tab_id | 84 | INT32 | 未显式声明 |
| last_thread_id | 85 | INT64 | 未显式声明 |
| tab_name | 86 | STRING | 未显式声明 |
| is_general_tab | 87 | INT32 | 未显式声明 |
| tab_type | 88 | INT32 | 未显式声明 |
| is_video_doublerow | 89 | INT32 | 未显式声明 |
| partition_type | 90 | INT32 | 未显式声明 |
| first_get_less_data | 91 | INT32 | 未显式声明 |
| first_get_normal_data | 92 | INT32 | 未显式声明 |
| tid_src | 93 | UINT64 | 未显式声明 |
| nid_src | 94 | STRING | 未显式声明 |
| feed_page_source | 95 | STRING | 未显式声明 |
| click_id | 96 | STRING | 未显式声明 |
| first_request | 97 | INT32 | 未显式声明 |
| nid_tb_src | 98 | STRING | 未显式声明 |
| user_read_style | 99 | INT32 | 未显式声明 |
| feed_behavior_context | 100 | STRING | 未显式声明 |
| app_launch_from | 101 | STRING | 未显式声明 |
| current_load_pn | 102 | INT32 | 未显式声明 |

## Ltbclient/FrsPage/FrsPageReqIdl;

来源：classes5.dex，class_def 索引 3719。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| data | 1 | Ltbclient/FrsPage/DataReq; | 未显式声明 |

## Ltbclient/PbFloor/DataReq;

来源：classes5.dex，class_def 索引 5777。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| kz | 1 | INT64 | 未显式声明 |
| pid | 2 | INT64 | 未显式声明 |
| spid | 3 | INT64 | 未显式声明 |
| pn | 4 | INT32 | 未显式声明 |
| scr_w | 5 | INT32 | 未显式声明 |
| scr_h | 6 | INT32 | 未显式声明 |
| scr_dip | 7 | DOUBLE | 未显式声明 |
| st_type | 8 | STRING | 未显式声明 |
| common | 9 | Ltbclient/CommonReq; | 未显式声明 |
| is_comm_reverse | 10 | INT32 | 未显式声明 |
| forum_id | 11 | INT64 | 未显式声明 |
| ori_ugc_nid | 12 | STRING | 未显式声明 |
| ori_ugc_tid | 13 | STRING | 未显式声明 |
| ori_ugc_type | 15 | INT32 | 未显式声明 |
| ori_ugc_vid | 16 | STRING | 未显式声明 |
| top_ugc_pid | 17 | STRING | 未显式声明 |
| request_times | 18 | INT32 | 未显式声明 |
| sort | 19 | INT32 | 未显式声明 |
| out_floor_post_ids | 20 | STRING | 未显式声明 |
| floor_type | 21 | INT32 | 未显式声明 |

## Ltbclient/PbFloor/PbFloorReqIdl;

来源：classes5.dex，class_def 索引 5783。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| data | 1 | Ltbclient/PbFloor/DataReq; | 未显式声明 |

## Ltbclient/PbPage/DataReq;

来源：classes5.dex，class_def 索引 5876。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| pb_rn | 1 | INT32 | 未显式声明 |
| mark | 2 | INT32 | 未显式声明 |
| back | 3 | INT32 | 未显式声明 |
| kz | 4 | INT64 | 未显式声明 |
| lz | 5 | INT32 | 未显式声明 |
| r | 6 | INT32 | 未显式声明 |
| pid | 7 | INT64 | 未显式声明 |
| with_floor | 8 | INT32 | 未显式声明 |
| floor_rn | 9 | INT32 | 未显式声明 |
| weipost | 10 | INT32 | 未显式声明 |
| message_id | 11 | INT32 | 未显式声明 |
| s_model | 12 | INT32 | 未显式声明 |
| rn | 13 | INT32 | 未显式声明 |
| scr_w | 14 | INT32 | 未显式声明 |
| scr_h | 15 | INT32 | 未显式声明 |
| scr_dip | 16 | DOUBLE | 未显式声明 |
| q_type | 17 | INT32 | 未显式声明 |
| pn | 18 | INT32 | 未显式声明 |
| st_type | 19 | STRING | 未显式声明 |
| thread_type | 20 | INT32 | 未显式声明 |
| banner | 21 | INT32 | 未显式声明 |
| arround | 22 | INT32 | 未显式声明 |
| last | 23 | INT32 | 未显式声明 |
| msg_click | 24 | STRING | 未显式声明 |
| common | 25 | Ltbclient/CommonReq; | 未显式声明 |
| lastids | 26 | STRING | 未显式声明 |
| st_from | 27 | STRING | 未显式声明 |
| st_link | 28 | STRING | 未显式声明 |
| st_stat | 29 | INT32 | 未显式声明 |
| st_task | 30 | INT64 | 未显式声明 |
| issdk | 31 | INT32 | 未显式声明 |
| query_word | 32 | STRING | 未显式声明 |
| is_comm_reverse | 33 | INT32 | 未显式声明 |
| is_jumpfloor | 34 | INT32 | 未显式声明 |
| jumpfloor_num | 35 | INT32 | 未显式声明 |
| da_idfa | 42 | STRING | 未显式声明 |
| platform | 43 | STRING | 未显式声明 |
| jid | 44 | UINT64 | 未显式声明 |
| fid | 45 | UINT64 | 未显式声明 |
| jfrom | 46 | STRING | 未显式声明 |
| yuelaou_locate | 47 | STRING | 未显式声明 |
| yuelaou_params | 48 | STRING | 未显式声明 |
| obj_source | 50 | STRING | 未显式声明 |
| obj_locate | 51 | STRING | 未显式声明 |
| obj_param1 | 52 | STRING | 未显式声明 |
| app_pos | 53 | Ltbclient/AppPosInfo; | 未显式声明 |
| from_smart_frs | 54 | UINT32 | 未显式声明 |
| feed_nid | 55 | STRING | 未显式声明 |
| forum_id | 56 | INT64 | 未显式声明 |
| need_repost_recommend_forum | 57 | INT32 | 未显式声明 |
| ad_param | 58 | Ltbclient/PbPage/AdParam; | 未显式声明 |
| need_log | 59 | INT32 | 未显式声明 |
| call_url | 60 | STRING | 未显式声明 |
| shoubai_cuid | 61 | STRING | 未显式声明 |
| ori_ugc_nid | 62 | STRING | 未显式声明 |
| ori_ugc_tid | 63 | STRING | 未显式声明 |
| ori_ugc_type | 65 | INT32 | 未显式声明 |
| ori_ugc_vid | 66 | STRING | 未显式声明 |
| after_ad_thread_count | 67 | INT32 | 未显式声明 |
| ad_context_list | 68 | STRING | 未显式声明 |
| up_schema | 69 | STRING | 未显式声明 |
| pb_test_info | 70 | STRING | 未显式声明 |
| from_push | 71 | INT32 | 未显式声明 |
| ad_ext_params | 72 | STRING | 未显式声明 |
| broadcast_id | 73 | INT64 | 未显式声明 |
| floor_sort_type | 74 | INT32 | 未显式声明 |
| source_type | 75 | INT32 | 未显式声明 |
| immersion_video_comment_source | 76 | INT32 | 未显式声明 |
| app_transmit_data | 77 | Ltbclient/AppTransmitData; | 未显式声明 |
| is_fold_comment_req | 78 | INT32 | 未显式声明 |
| is_edit_comment_req | 79 | INT32 | 未显式声明 |
| request_times | 80 | INT32 | 未显式声明 |
| last_pid | 81 | INT64 | 未显式声明 |
| similar_from | 82 | INT32 | 未显式声明 |
| come_from | 83 | STRING | 未显式声明 |
| search_query | 84 | STRING | 未显式声明 |
| push_info | 86 | Ltbclient/PushInfo; | 未显式声明 |
| mount_bot_uk | 87 | STRING | 未显式声明 |
| log_param | 88 | STRING | 未显式声明 |
| game_id | 89 | STRING | 未显式声明 |
| cid | 90 | STRING | 未显式声明 |
| page_from | 91 | INT32 | 未显式声明 |
| position | 92 | INT32 | 未显式声明 |
| game_fid | 93 | STRING | 未显式声明 |
| game_fname | 94 | STRING | 未显式声明 |
| ad_bear_pb_banner | 95 | STRING | 未显式声明 |
| ad_bear_pb_comment | 96 | STRING | 未显式声明 |
| tab_type | 97 | STRING | 未显式声明 |
| tab_id | 98 | UINT64 | 未显式声明 |
| eqid | 99 | STRING | 未显式声明 |
| is_note | 100 | INT32 | 未显式声明 |
| aladdin_src_id | 101 | INT64 | 未显式声明 |
| top_pid | 102 | INT64 | 未显式声明 |
| ad_external_banner_info | 103 | STRING | 未显式声明 |
| ad_external_info | 104 | STRING | 未显式声明 |
| topic_id | 105 | INT64 | 未显式声明 |
| topic_fid | 106 | INT64 | 未显式声明 |
| need_data_type | 107 | INT32 | 未显式声明 |
| session_request_times | 108 | INT32 | 未显式声明 |
| biz_type | 109 | INT32 | 未显式声明 |
| offset | 110 | STRING | 未显式声明 |
| from_forum_id | 111 | UINT32 | 未显式声明 |
| floor_num | 112 | UINT32 | 未显式声明 |
| app_launch_from | 113 | STRING | 未显式声明 |
| floor_type | 114 | INT32 | 未显式声明 |

## Ltbclient/PbPage/PbPageReqIdl;

来源：classes5.dex，class_def 索引 5909。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| data | 1 | Ltbclient/PbPage/DataReq; | 未显式声明 |

## Ltbclient/Profile/DataReq;

来源：classes5.dex，class_def 索引 6200。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| uid | 1 | INT64 | 未显式声明 |
| need_post_count | 2 | UINT32 | 未显式声明 |
| friend_uid | 3 | INT64 | 未显式声明 |
| is_guest | 4 | UINT32 | 未显式声明 |
| st_type | 5 | STRING | 未显式声明 |
| pn | 6 | UINT32 | 未显式声明 |
| rn | 7 | UINT32 | 未显式声明 |
| has_plist | 8 | UINT32 | 未显式声明 |
| common | 9 | Ltbclient/CommonReq; | 未显式声明 |
| scr_w | 10 | UINT32 | 未显式声明 |
| scr_h | 11 | UINT32 | 未显式声明 |
| q_type | 12 | UINT32 | 未显式声明 |
| scr_dip | 13 | DOUBLE | 未显式声明 |
| is_from_usercenter | 14 | INT32 | 未显式声明 |
| page | 15 | INT32 | 未显式声明 |
| friend_uid_portrait | 16 | STRING | 未显式声明 |
| history_forum_ids | 17 | STRING | 未显式声明 |
| history_forum_names | 18 | STRING | 未显式声明 |
| need_usergrowth_task | 19 | INT32 | 未显式声明 |
| is_enable_naws | 20 | INT32 | 未显式声明 |
| request_time | 21 | INT32 | 未显式声明 |
| from_page | 22 | STRING | 未显式声明 |

## Ltbclient/Profile/ProfileReqIdl;

来源：classes5.dex，class_def 索引 6245。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| data | 1 | Ltbclient/Profile/DataReq; | 未显式声明 |

## Ltbclient/SearchPostForum/DataReq;

来源：classes5.dex，class_def 索引 6608。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| common | 1 | Ltbclient/CommonReq; | 未显式声明 |
| word | 2 | STRING | 未显式声明 |

## Ltbclient/SearchPostForum/SearchPostForumReqIdl;

来源：classes5.dex，class_def 索引 6617。

| 字段 | tag | 显式 Wire 类型 / Java 描述符 | label |
| --- | --- | --- | --- |
| data | 1 | Ltbclient/SearchPostForum/DataReq; | 未显式声明 |
