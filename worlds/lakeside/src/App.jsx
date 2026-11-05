import NatureExperience from '../../../shared/experiences/NatureExperience.jsx';

const world = {
  id: 'lakeside', title: '湖畔', english: 'Lakeside',
  model: '/models/lakeside-glow-1bf1ea35148c.glb', preview: '/previews/lakeside-glow-ee7e99ca857e.png',
  lead: '湖面のゆらぎ、蛍、光の粒子。',
  description: '月明かりの湖に漂う光を、視点を変えながら眺められます。',
  note: '湖面に映る月と森、桟橋のランタン。蛍と光の粒子がゆっくり巡ります。音声はありません。',
};

export default function App() { return <NatureExperience world={world} />; }
