"use client";
import { useMemo } from "react";
import { cx } from "@/lib/cx";
import { PRODUCTS } from "@/lib/reference-pages";
import { Inert } from "@/components/shell/Inert";
import { usePageActions } from "@/components/shell/ShellContext";
import { IconCloud, IconDevice, IconHelp, IconSparkle } from "@/components/shell/icons";
import styles from "./pages.module.css";

const FEATURE_ICONS = [<IconSparkle key="a" />, <IconCloud key="b" />, <IconDevice key="c" />];

/**
 * MaxHermes / MaxClaw (STORY_025; page-maxhermes@1440, page-maxclaw@1440): the product name in its colour, the line,
 * Start now, a banner, the three feature rows. The banner is our plain panel, not the reference's art (Departures).
 */
export function ProductPage({ product }: { readonly product: "max-hermes" | "max-claw" }) {
  const page = PRODUCTS[product];
  const actions = useMemo(() => <Inert label="Help" className={cx(styles.barIcon, styles.barRight)} align="end"><IconHelp /></Inert>, []);
  usePageActions(actions);
  return (
    <main className={cx(styles.page, styles.productPage)} data-testid="product-page">
      <p className={styles.productName} style={{ color: page.colour }}>{page.name}</p>
      <h1 className={styles.productTagline}>{page.tagline}</h1>
      <Inert label="Start now" className={styles.productStart}>Start now</Inert>
      <div className={styles.productBanner} aria-hidden="true">{page.name.replace("Max", "Max ")}</div>
      <p className={styles.productSection}>{page.sectionTitle}</p>
      <ul className={styles.features}>
        {page.features.map((feature, i) => (
          <li key={feature} className={styles.feature}>
            <span className={styles.featureIcon} aria-hidden="true">{FEATURE_ICONS[i]}</span>
            {feature}
          </li>
        ))}
      </ul>
      {page.availableOn ? (
        <div className={styles.availableOn}>
          <span>Available on</span>
          <span className={styles.availableOnName}>◎ {page.availableOn}</span>
        </div>
      ) : null}
    </main>
  );
}
