# C³ CELERITY

The panel runs on this server, but the proxy nodes do not. The panel installs Hysteria 2 or Xray on VPS servers that you rent, over SSH. Your users' apps connect to those nodes, never to this server. The nodes call this server to check each user who connects, and the apps fetch their subscriptions from it, so the panel needs a public domain for that traffic.

## Documentation

- [C³ CELERITY README](https://github.com/ClickDevTech/CELERITY-panel/blob/main/README.md) — the features, node setup, the cascade topology, the API and the webhooks.
- [External diagnostic probes](https://github.com/ClickDevTech/CELERITY-panel/blob/main/docs/probes.md) — checking node reachability from other networks.
- [Generic CDN nodes](https://github.com/ClickDevTech/CELERITY-panel/blob/main/docs/cdn-nodes.md) — publishing Xray inbounds through a CDN.
- [MCP setup guide](https://github.com/ClickDevTech/CELERITY-panel/blob/main/docs/mcp-user-guide.md) — managing the panel from an AI assistant.

## What you get on StartOS

The service has two interfaces:

- **Admin Panel** opens the panel, where you manage nodes, users and settings. Keep this interface private: reach it on your LAN, over Tor, or through a tunnel without a public domain.
- **Node and Subscription API** carries only what machines need: the check that nodes make for each user who connects, the subscription links that your users import into Clash, sing-box, Shadowrocket or Hiddify, uploads from nodes and probes, and agent downloads. Every other path on this interface answers "not found", so publishing it does not publish the panel.

## Getting set up

1. Run **Set Admin Password**. The action creates the admin account and shows its username and password. Save the password in your password manager.
2. Open the service's **Outbound Traffic** tab and set **Gateway** to the gateway that will carry the API, usually your StartTunnel. See [Your home IP address and Xray nodes](#your-home-ip-address-and-xray-nodes) for why.
3. Open **Interfaces**, then **Node and Subscription API**. On that same gateway, click **Add Domain**, select **Public Domain**, and add your domain. StartOS checks the domain's DNS record and port forwarding and obtains a certificate from Let's Encrypt. Your nodes and your users' apps must be able to reach that domain.
4. Run **Set API Address** and choose that domain from the list. The panel puts the address in node configurations and in every subscription link.
5. Start the service, open the **Admin Panel** interface, and sign in with the admin credentials.
6. The panel opens its setup wizard at the first sign-in. Choose **Manage remote nodes**. **Deploy on this server** does not work on StartOS, because the panel runs in a container that cannot host a proxy node.
7. Add a node in the panel with the IP address and the SSH credentials of a VPS server, and click **Auto Setup**. The panel installs Hysteria 2 or Xray on the VPS server and opens the ports that the node needs in the VPS server's firewall.

If you change the API address after you set up nodes, open each node in the panel and push its configuration again, and give your users their new subscription links.

## Signing in

Sign in over an HTTPS address of the **Admin Panel** interface. The panel only keeps a session over HTTPS, so signing in over a plain HTTP address returns you to the login page.

The admin username is `admin`. Running **Set Admin Password** again replaces the password, including a password that you changed in the panel, and restarts the panel if it is running.

If you turned on two-factor authentication in the panel and lost your authenticator app, run **Disable Two-Factor Authentication** while the service is running. You can then sign in with the password alone and turn two-factor authentication on again under **Settings**, **Security**.

## Certificates on nodes

The panel's own certificate stays on this server, so nodes cannot reuse it. When you set up an Xray node with TLS, choose a TLS source other than the panel's certificate, such as Let's Encrypt on the node's own domain, or use REALITY. Each node that gets a certificate from Let's Encrypt needs its own ACME email address in the node's settings, because this server sets no panel-wide ACME email.

## Updates

StartOS updates the panel. The update section under the panel's own **Settings** can show that a new release exists, but the panel cannot update itself here.

## Your home IP address and Xray nodes

The panel connects to your nodes over SSH, so each node's provider can see the address that the connections come from. When the panel sets up an Xray node, it also allows the node's agent port only from the IP address that your API domain points to.

Set the service's **Outbound Traffic** gateway to the same gateway that carries the API domain. That keeps your home IP address private when the gateway is a tunnel, and it makes the panel's connections come from the address that Xray nodes allow. If the outbound traffic leaves through another gateway, the panel cannot reach the agents on Xray nodes.
