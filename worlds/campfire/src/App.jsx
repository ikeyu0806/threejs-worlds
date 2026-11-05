import NatureExperience from '../../../shared/experiences/NatureExperience.jsx';

const world = {
  id: 'campfire', title: '焚き火', english: 'Campfire',
  model: '/models/hearth-fire-625ffa8f42ae.glb', preview: '/previews/hearth-fire-02cd10464f26.png',
  audio: '/audio/campfire-ambience.ogg', lead: '炎・火の粉・煙。',
  description: '炎と火の粉を眺める焚き火の空間。ドラッグして、好きな角度から眺められます。',
  note: '石と薪に囲まれた焚き火。炎、火の粉、煙はブラウザで動き、薪と石の形状はBlenderで制作しています。',
};

export default function App() { return <NatureExperience world={world} />; }
