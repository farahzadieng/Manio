import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  useReducedMotion,
} from "motion/react";
import * as m from "motion/react-m";
import type { ReactNode } from "react";

type FadeThroughProps = {
  pageKey: string;
  children: ReactNode;
};

const ENTER_EASE = [0.2, 0, 0, 1] as const;
const EXIT_EASE = [0.4, 0, 1, 1] as const;

/** Keeps the old page visible while it fades out, then reveals the next page. */
export default function FadeThrough({ pageKey, children }: FadeThroughProps) {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence
        initial={false}
        mode="wait"
        onExitComplete={() => window.scrollTo({ top: 0, behavior: "instant" })}
      >
        <m.div
          key={pageKey}
          className="fade-through-surface"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={
            reduceMotion
              ? { opacity: 1, transition: { duration: 0 } }
              : {
                  opacity: 0,
                  transition: { duration: 0.32, ease: EXIT_EASE },
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.56, ease: ENTER_EASE }
          }
        >
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
