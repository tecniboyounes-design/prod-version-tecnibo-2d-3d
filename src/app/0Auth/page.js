"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_BASE || "https://backend.tecnibo.com";

export default function Home() {
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [partner, setPartner] = useState(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerError, setPartnerError] = useState("");

  const loadMe = async () => {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`${BACKEND_BASE}/api/me`, {
        cache: "no-store",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMe(null);
        setStatus("unauth");
        if (data?.error && data.error !== "no_access_token") setError(data.error);
        return;
      }

      setMe(data?.userinfo || null);
      setStatus("ok");
    } catch (e) {
      setMe(null);
      setStatus("error");
      setError("Network connection issue with identity provider");
    }
  };

  const loadPartner = async () => {
    if (!me) return;

    setPartnerLoading(true);
    setPartnerError("");

    try {
      const response = await fetch(`${BACKEND_BASE}/api/odoo/partner`, {
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setPartnerError(data?.message || data?.error || "Failed to fetch partner data");
        setPartner(null);
      } else if (data?.partner) {
        setPartner(data.partner);
      } else {
        setPartnerError("No partner record found for this user");
        setPartner(null);
      }
    } catch (e) {
      setPartnerError("Network error while fetching partner data");
      setPartner(null);
    } finally {
      setPartnerLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (status === "ok" && me) {
      loadPartner();
    }
  }, [status, me]);

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };



  const formatAddress = (p) => {
    if (!p) return "No address";
    const parts = [];
    if (p.street) parts.push(p.street);
    if (p.street2) parts.push(p.street2);
    const cityLine = [];
    if (p.zip) cityLine.push(p.zip);
    if (p.city) cityLine.push(p.city);
    if (cityLine.length) parts.push(cityLine.join(" "));
    if (p.state_id && p.state_id[1]) parts.push(p.state_id[1]);
    if (p.country_id && p.country_id[1]) parts.push(p.country_id[1]);
    return parts.join(", ") || "No address";
  };
  // Read returnTo from query param (not window.location.href — that would loop back to /0Auth)
  const [returnTo, setReturnTo] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const rt = params.get("returnTo");
      setReturnTo(rt || "/");
    }
  }, []);

  // Auto-redirect when already authenticated and there is a destination
  useEffect(() => {
    if (status === "ok" && returnTo && returnTo !== "/0Auth") {
      window.location.replace(returnTo);
    }
  }, [status, returnTo]);
  
  const loginUrl = returnTo
    ? `${BACKEND_BASE}/api/odoo/login?returnTo=${encodeURIComponent(returnTo)}`
    : `${BACKEND_BASE}/api/odoo/login`;

  const logoutUrl = returnTo
    ? `${BACKEND_BASE}/api/odoo/logout?returnTo=${encodeURIComponent(returnTo)}`
    : `${BACKEND_BASE}/api/odoo/logout`;


  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>T</div>
          <h1 className={styles.title}>Tecnibo Portal</h1>
          <p className={styles.subtitle}>
            Professional access to Odoo services for Tecnibo Morocco.
          </p>
        </div>

        {status === "loading" ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
          </div>
        ) : (
          <div className={styles.contentWrap}>
            <div className={styles.actions}>
              {status === "ok" ? (
                <>
                  <div className={`${styles.badge} ${styles.badgeAuth}`}>Session Active</div>

                  <div className={styles.userProfile}>
                    <div className={styles.avatar}>{getInitials(me?.name)}</div>
                    <div className={styles.userInfo}>
                      <h4>{me?.name || "Odoo User"}</h4>
                      <p>{me?.email || me?.login || "Authenticated"}</p>
                    </div>
                  </div>

                  <a href={logoutUrl} className={styles.logoutBtn}>
                    Sign out of session
                  </a>
                </>
              ) : (
                <>
                  <div className={`${styles.badge} ${styles.badgeUnauth}`}>
                    Identity Verification Required
                  </div>

                  <a className={styles.primaryBtn} href={loginUrl}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="15" y1="12" x2="3" y2="12" />
                      <polyline points="12 19 19 12 12 5" />
                    </svg>
                    Continue with Odoo Access
                  </a>
                </>
              )}

              <button className={styles.secondaryBtn} onClick={loadMe}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                {status === "ok" ? "Refresh Identity" : "Check Status"}
              </button>

              {status === "ok" && (
                <button className={styles.secondaryBtn} onClick={loadPartner}>
                  Load Partner
                </button>
              )}
            </div>

            {error && (
              <div className={styles.statusContainer} style={{ borderColor: "#F87171" }}>
                <p style={{ color: "#F87171", fontSize: "14px", margin: 0 }}>{error}</p>
              </div>
            )}

            {status === "ok" && me && (
              <details className={styles.statusContainer}>
                <summary style={{ cursor: "pointer", fontSize: "13px", color: "#94A3B8", fontWeight: 500 }}>
                  Technical Metadata
                </summary>
                <pre className={styles.panel}>{JSON.stringify(me, null, 2)}</pre>
              </details>
            )}

            {status === "ok" && (
              <>
                {partnerLoading && (
                  <div className={styles.partnerCard}>
                    <div className={styles.loading}>
                      <div className={styles.spinner}></div>
                      <p style={{ marginTop: "12px", color: "#94A3B8", fontSize: "14px" }}>
                        Loading partner data...
                      </p>
                    </div>
                  </div>
                )}

                {!partnerLoading && partnerError && (
                  <div className={styles.partnerCard}>
                    <p style={{ color: "#F87171", fontSize: "14px", margin: 0 }}>{partnerError}</p>
                  </div>
                )}

                {!partnerLoading && partner && (
                  <div className={styles.partnerCard}>
                    <h3 className={styles.partnerTitle}>Partner Information</h3>
                    <div className={styles.partnerGrid}>
                      <div className={styles.partnerRow}>
                        <div>
                          <div className={styles.partnerLabel}>Name</div>
                          <div className={styles.partnerValue}>{partner.name}</div>
                        </div>
                      </div>

                      <div className={styles.partnerRow}>
                        <div>
                          <div className={styles.partnerLabel}>Address</div>
                          <div className={styles.partnerValue}>{formatAddress(partner)}</div>
                        </div>
                      </div>

                      {partner.phone && (
                        <div className={styles.partnerRow}>
                          <div>
                            <div className={styles.partnerLabel}>Phone</div>
                            <div className={styles.partnerValue}>{partner.phone}</div>
                          </div>
                        </div>
                      )}

                      {partner.mobile && (
                        <div className={styles.partnerRow}>
                          <div>
                            <div className={styles.partnerLabel}>Mobile</div>
                            <div className={styles.partnerValue}>{partner.mobile}</div>
                          </div>
                        </div>
                      )}

                      {partner.function && (
                        <div className={styles.partnerRow}>
                          <div>
                            <div className={styles.partnerLabel}>Job Title</div>
                            <div className={styles.partnerValue}>{partner.function}</div>
                          </div>
                        </div>
                      )}

                      {partner.company_name && (
                        <div className={styles.partnerRow}>
                          <div>
                            <div className={styles.partnerLabel}>Company</div>
                            <div className={styles.partnerValue}>{partner.company_name}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <footer
        style={{
          marginTop: "24px",
          color: "#475569",
          fontSize: "12px",
          textAlign: "center",
        }}
      >
        &copy; {new Date().getFullYear()} Tecnibo Morocco • Tétouan High-Performance Node
      </footer>
    </div>
  );


}

