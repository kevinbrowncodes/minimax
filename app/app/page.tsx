import { Composer } from "@/components/composer/Composer";
import styles from "./home.module.css";

// Home (STORY_012 + STORY_013): the shell's heading and the composer.
export default function HomePage() {
  return (
    <main className={styles.home}>
      <h1 className={styles.heading}>MiniMax makes your work easier</h1>
      <Composer />
    </main>
  );
}
