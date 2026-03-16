#!/bin/sh
set -e

cat > /tmp/policy.json << EOF
{
  "on_http_request": [
    {
      "actions": [
        {
          "type": "oauth",
          "config": {
            "provider": "google",
            "client_id": "$GOOGLE_CLIENT_ID",
            "client_secret": "$GOOGLE_CLIENT_SECRET",
            "scopes": [
              "https://www.googleapis.com/auth/userinfo.profile",
              "https://www.googleapis.com/auth/userinfo.email"
            ]
          }
        }
      ]
    },
    {
      "expressions": [
        "!(actions.ngrok.oauth.identity.email in ['tatsurou.ssr310@gmail.com'])"
      ],
      "actions": [
        {
          "type": "deny"
        }
      ]
    }
  ]
}
EOF

exec ngrok http app:3000 --traffic-policy-file /tmp/policy.json --log stdout
