import PublicContentPage from '../components/public/PublicContentPage';
import { PUBLIC_PAGES } from '../data/public-content';
export async function getServerSideProps({ req }) { return { props: { nonce: req.headers['x-nonce'] || null } }; }
export default function ServerRulesPage({ nonce }) { return <PublicContentPage page={PUBLIC_PAGES['server-rules']} path="/server-rules" nonce={nonce} />; }
