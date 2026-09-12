import styles from "./home.module.css";

// Home (STORY_012): the shell and the heading; the composer arrives with STORY_013.
export default function HomePage() {
  return (
    <main className={styles.home}>
      <h1 className={styles.heading}>MiniMax makes your work easier</h1>
    </main>
  );
}
