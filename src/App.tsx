import { HomePage } from '@/pages/HomePage';

/**
 * The champion-guessing game is the landing experience. It needs no backend
 * or data, so it is not gated behind sign-in — it runs fully locally and,
 * when deployed to Fabric, the embedded auth still initializes in the
 * background via the AuthProvider in `main.tsx`.
 */
function App() {
  return <HomePage />;
}

export default App;
