import PublicContentPage from '../../components/public/PublicContentPage';
import { DEPARTMENTS } from '../../data/public-content';

export default function DepartmentPage({ slug }) {
  return <PublicContentPage page={DEPARTMENTS[slug]} path={`/departments/${slug}`} department />;
}

export function getStaticPaths() {
  return { paths: Object.keys(DEPARTMENTS).map((slug) => ({ params: { slug } })), fallback: false };
}

export function getStaticProps({ params }) {
  return { props: { slug: params.slug } };
}
