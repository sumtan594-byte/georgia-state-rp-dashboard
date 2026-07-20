import PublicContentPage from '../components/public/PublicContentPage';
import { PUBLIC_PAGES } from '../data/public-content';
export default function EventsPage() { return <PublicContentPage page={PUBLIC_PAGES.events} path="/events" />; }
