export default function TestCrash() {
  throw new Error("Test crash from TestCrash component!");

}
/* if u want to test error boundary, call it in the main.tsx  */