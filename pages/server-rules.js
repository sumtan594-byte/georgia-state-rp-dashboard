import PublicContentPage from '../components/public/PublicContentPage';
import { PUBLIC_PAGES } from '../data/public-content';
export default function ServerRulesPage() { return <PublicContentPage page={PUBLIC_PAGES['server-rules']} path="/server-rules" />; }
