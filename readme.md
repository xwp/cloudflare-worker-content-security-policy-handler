# Cloudflare Worker CSP Violation Handler

This project is a Cloudflare Worker that handles Content Security Policy (CSP) header violations and sends email notifications using Worker Cron. It uses Mailgun to send the emails.

## Prerequisites

Before getting started, make sure you have the following:

- A Cloudflare account
- A Mailgun account and API key.
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed.

## Configuration

1. Clone this repository:

    ```bash
    git clone https://github.com/PatelUtkarsh/cf-worker-content-security-policy-handler.git
    ```

2. Install the project dependencies:

    ```bash
    cd cf-worker-content-security-policy-handler
    npm install
    ```

3. Update the `wrangler.toml` file with your configuration details.

    Update the binding name by creating a KV and ID. You can use the following command to create a KV namespace:

    ```bash
    npx wrangler kv:namespace create "MY_KV"
    ```

    Update cron schedule as needed.

    Update mailgun API key, from email address, to email address, and mailgun domain.

    ```toml
    [[kv_namespaces]]
    binding = "CSP"
    id = "{update_me}"

    [triggers]
    crons = ["0 0 * * 2"]

    [vars]
    MAILGUN_API_KEY = ""
    FROM_EMAIL_ADDRESS = ""
    TO_EMAIL_ADDRESS = ""
    MAILGUN_DOMAIN = ""
    ```

## Deploying the Worker

To deploy the worker, run the following command:
