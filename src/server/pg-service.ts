import { execSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";

let startingPromise: Promise<boolean> | null = null;

export async function isPgPortOpen(port = 5432, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(800);
    s.on("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => {
      s.destroy();
      resolve(false);
    });
    s.on("timeout", () => {
      s.destroy();
      resolve(false);
    });
    s.connect(port, host);
  });
}

export async function ensurePostgresService(): Promise<boolean> {
  const dbUrl = process.env["DATABASE_URL"] || "";
  const isLocalDb = dbUrl.includes("localhost:5432") || dbUrl.includes("127.0.0.1:5432");

  if (!isLocalDb) {
    return true;
  }

  const alreadyOpen = await isPgPortOpen(5432, "127.0.0.1");
  if (alreadyOpen) {
    return true;
  }

  if (startingPromise) {
    return startingPromise;
  }

  startingPromise = (async () => {
    try {
      const pgctlPath = "/opt/postgresql/usr/lib/postgresql/15/bin/pg_ctl";
      if (!fs.existsSync(pgctlPath)) {
        return false;
      }

      // Ensure /var/run/postgresql exists
      if (!fs.existsSync("/var/run/postgresql")) {
        try {
          execSync(
            "mkdir -p /var/run/postgresql && chown -R postgres:postgres /var/run/postgresql",
            { stdio: "ignore" },
          );
        } catch (err) {
          console.debug("Could not create /var/run/postgresql:", err);
        }
      }

      // Start the daemon as user postgres
      try {
        execSync(
          'su - postgres -c "/opt/postgresql/usr/lib/postgresql/15/bin/pg_ctl -D /data/postgres -l /data/postgres/server.log start"',
          { stdio: "ignore" },
        );
      } catch (err) {
        console.debug("Could not launch pg_ctl start:", err);
      }

      // Wait up to 3 seconds for port to open
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const isOpen = await isPgPortOpen(5432, "127.0.0.1");
        if (isOpen) {
          console.log("PostgreSQL service successfully started and listening on 5432.");
          return true;
        }
      }

      return false;
    } catch (err) {
      console.warn("Could not start local PostgreSQL daemon:", err);
      return false;
    } finally {
      startingPromise = null;
    }
  })();

  return startingPromise;
}
