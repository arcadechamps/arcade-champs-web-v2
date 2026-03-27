import OnboardingTour, { type TourStep } from "./OnboardingTour";

const CONTEST_TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="contest-list"]',
    title: "Browse Contests",
    description: "Here you can see all available contests. Active, upcoming, and closed contests are all listed.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="contest-card"]',
    title: "Contest Details",
    description: "Each contest shows the entry fee, session duration, number of games, and anti-cheat status.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="contest-join"]',
    title: "Enter a Contest",
    description: "Click here to join a contest. Once joined, you'll be able to see and play the contest games.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="contest-games"]',
    title: "View Games",
    description: "After joining, expand this to see all contest games. Click any game to start playing in contest mode with a countdown timer!",
    position: "bottom",
  },
];

const ContestTour = () => {
  return (
    <OnboardingTour
      steps={CONTEST_TOUR_STEPS}
      storageKey="onboarding-contest-complete"
    />
  );
};

export default ContestTour;
