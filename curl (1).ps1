# after changing the email and password copy past script in Powershell and click enter 
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    jsonrpc = "2.0"
    method  = "call"
    params  = @{
        db       = "tecnibo17_test"  
        login    = "y.attaoui@tecnibo.com"
        password = "Y5EhmP5BX-r9Fru"
    }
    id = 1
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://192.168.30.33:8069/web/session/authenticate" -Method POST -Headers $headers -Body $body

{
    "session_id": "4775d5851b26cac4f16c0a2800f9526b85a2be81",
    "user": {
        "uid": 447,
        "is_system": false,
        "is_admin": false,
        "is_public": false,
        "is_internal_user": true,
        "user_context": {
            "lang": "en_US",
            "tz": "Africa/Casablanca",
            "uid": 447
        },
        "db": "tecnibo17_test",
        "user_settings": {
            "id": 137,
            "user_id": {
                "id": 447
            },
            "is_discuss_sidebar_category_channel_open": true,
            "is_discuss_sidebar_category_chat_open": true,
            "push_to_talk_key": false,
            "use_push_to_talk": false,
            "voice_active_duration": 200,
            "volume_settings_ids": [
                [
                    "ADD",
                    []
                ]
            ],
            "homemenu_config": false,
            "voip_username": false,
            "voip_secret": false,
            "should_call_from_another_device": false,
            "external_device_number": false,
            "should_auto_reject_incoming_calls": false,
            "how_to_call_on_mobile": "ask"
        },
        "server_version": "17.0+e",
        "server_version_info": [
            17,
            0,
            0,
            "final",
            0,
            "e"
        ],
        "support_url": "https://www.odoo.com/help",
        "name": "Younes Attaoui",
        "username": "y.attaoui@tecnibo.com",
        "partner_display_name": "Younes Attaoui",
        "partner_id": 17909,
        "web.base.url": "https://www.tecnibo.com",
        "active_ids_limit": 20000,
        "profile_session": null,
        "profile_collectors": null,
        "profile_params": null,
        "max_file_upload_size": 134217728,
        "home_action_id": false,
        "cache_hashes": {
            "translations": "2d0f07866d7ab214845c343aaa5d9395740829f4",
            "load_menus": "a567ccf72d4c92ba6bf3d20c12c1780ad9e7f8708899c18405cc2e52d1773a28"
        },
        "currencies": {
            "1": {
                "symbol": "€",
                "position": "after",
                "digits": [
                    69,
                    2
                ]
            },
            "3": {
                "symbol": "$",
                "position": "before",
                "digits": [
                    69,
                    2
                ]
            },
            "29": {
                "symbol": "lei",
                "position": "after",
                "digits": [
                    69,
                    2
                ]
            },
            "111": {
                "symbol": "DH",
                "position": "after",
                "digits": [
                    69,
                    2
                ]
            },
            "147": {
                "symbol": "£",
                "position": "before",
                "digits": [
                    69,
                    2
                ]
            }
        },
        "bundle_params": {
            "lang": "en_US"
        },
        "user_companies": {
            "current_company": 11,
            "allowed_companies": {
                "11": {
                    "id": 11,
                    "name": "Tecnibo Morocco SRL",
                    "sequence": 10,
                    "child_ids": [],
                    "parent_id": false,
                    "timesheet_uom_id": 5,
                    "timesheet_uom_factor": 1
                }
            },
            "disallowed_ancestor_companies": {}
        },
        "show_effect": true,
        "display_switch_company_menu": false,
        "user_id": [
            447
        ],
        "max_time_between_keys_in_ms": 100,
        "websocket_worker_version": "17.0-1",
        "notification_type": "email",
        "warning": "user",
        "expiration_date": "2026-01-18 00:00:00",
        "expiration_reason": "renewal",
        "map_box_token": false,
        "odoobot_initialized": true,
        "ocn_token_key": false,
        "fcm_project_id": "186813708685",
        "inbox_action": 88,
        "is_quick_edit_mode_enabled": false,
        "uom_ids": {
            "5": {
                "id": 5,
                "name": "Heure(s)",
                "rounding": 0.01,
                "timesheet_widget": "float_time"
            }
        }
    }
}

