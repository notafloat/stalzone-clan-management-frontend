# Deploying on Oracle Cloud's free tier

This runs the site, Postgres, the tracker and HTTPS on one free ARM server with Docker Compose. Run the commands on your PC in Git Bash, and on the server over SSH.

## 1. Create the server

1. Sign up at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/). A card is needed for verification. **Your home region can't be changed later**, so pick one near your players that has free ARM capacity.
2. Go to Compute → Instances → Create instance:
   - Image: **Canonical Ubuntu 24.04**, the aarch64 build.
   - Shape: **VM.Standard.A1.Flex** with **1 OCPU and 4 GB RAM**. Check that it says "Always Free-eligible".
   - Add your SSH public key, and tick the option that assigns a public IPv4 address.
3. If you get "Out of capacity", try another availability domain, or try again later.
4. Open the ports: in the instance's subnet, open the Security List and add ingress rules from `0.0.0.0/0` for TCP 80, TCP 443 and UDP 443.

## 2. Get a domain

Any domain works. A free subdomain from [DuckDNS](https://www.duckdns.org) is enough to start. Point it at the server's public IP.

Then add `https://YOUR_DOMAIN/api/auth/callback` as a redirect URI in `@stalzone_api_bot` (`/myapps`). Sign-in won't work until this is done.

## 3. Install Docker on the server

```sh
ssh ubuntu@SERVER_IP
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```

Log back in afterwards so the group change applies.

## 4. Copy the code to the server

Only committed work is copied. On your PC, in Git Bash:

```sh
git archive --format=tar HEAD | ssh ubuntu@SERVER_IP "mkdir -p ~/mozg && tar -x -C ~/mozg"
```

## 5. Configure and start

```sh
ssh ubuntu@SERVER_IP
cd ~/mozg
cp .env.prod.example .env
chmod 600 .env
nano .env
docker compose -f compose.prod.yaml up -d --build
```

The first build takes several minutes. Check that it worked:

```sh
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs --tail=30 app tracker caddy
```

Open `https://YOUR_DOMAIN` and sign in. Members are added when a clan member opens `/clan` or `/members`, and the tracker takes it from there.

If the site can't be reached, also open the server's own firewall, then reload:

```sh
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 6. Set up backups

The database holds clan war marks, notes and history that exist nowhere else. On the server, run `crontab -e` and add:

```
0 4 * * * /home/ubuntu/mozg/deploy/backup.sh >> /home/ubuntu/mozg/backups/backup.log 2>&1
```

A backup on the server won't survive losing the server, so copy them to your PC regularly:

```sh
scp -r ubuntu@SERVER_IP:mozg/backups ./mozg-backups
```

To restore one:

```sh
gunzip -c backups/mozg-YYYY-MM-DD.sql.gz | docker compose -f compose.prod.yaml exec -T db psql -U stalzone stalzone_clan
```

## Updating the site

Commit your changes, repeat step 4, then on the server:

```sh
cd ~/mozg
docker compose -f compose.prod.yaml up -d --build
```

Migrations run automatically on every start. A build that fails leaves the running site as it was.

## If only VM.Standard.E2.1.Micro is available

First check that A1 is really unavailable: choose the aarch64 Ubuntu image, then look under Change shape → Ampere. Otherwise use Micro with the x86_64 Ubuntu image.

Micro has 1/8 OCPU and 1 GB RAM, which is too small to build the site. Add swap, build on your PC, and copy the images over.

Once, on the server, after installing Docker:

```sh
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

To deploy or update, do step 4 as usual to copy the code, then in Git Bash on your PC, with Docker Desktop running:

```sh
docker build --target migrator -t mozg-migrate .
docker build --target runner -t mozg-app .
docker save mozg-app mozg-migrate | gzip | ssh ubuntu@SERVER_IP "gunzip | docker load"
```

Then start it on the server. Use this in place of the `up -d --build` command in steps 5 and "Updating the site":

```sh
cd ~/mozg
docker compose -f compose.prod.yaml up -d --no-build
```

Each update uploads about 360 MB. In a test with limits close to Micro's, the first start took 6–12 minutes while the database set itself up, so give it time before assuming it failed. Pages then took 1–5 seconds, and saving a clan war took about 20 seconds.

## Oracle's limits

- **Idle servers:** Oracle can reclaim free servers it considers idle, reportedly when CPU, network and memory all stay under 20% for 7 days. This site may well count as idle: the whole stack used about 250 MB when nearly idle in testing, roughly 6% of 4 GB. Keep your backups on your PC up to date because of this. Upgrading the account to Pay As You Go is the usual way to rule it out, but anything above the free limits is then billed.
- **Free allowance:** recent reports put it at 2 OCPU and 12 GB of ARM in total, down from 4 OCPU and 24 GB, while some of Oracle's pages still show the old numbers. Check the limits in your console.
