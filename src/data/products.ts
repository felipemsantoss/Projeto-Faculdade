import type { Product } from '../types';

/**
 * Catálogo fictício. Cada peça carrega a própria paleta: o acento escolhido
 * aqui propaga para o fundo, o carrossel, o desafio e o carrinho.
 */
export const PRODUCTS: Product[] = [
  {
    id: 'obsidian',
    index: '01',
    name: 'Obsidian',
    category: 'Áudio espacial',
    price: 8940,
    tagline: 'O silêncio antes do som.',
    description:
      'Monólito acústico usinado em bloco único. Doze drivers em arranjo vertical projetam um campo sonoro que não parece vir de lugar nenhum.',
    material: 'Alumínio anodizado fosco',
    edition: 'Edição de 200',
    accent: '#a78bfa',
    accentDeep: '#2a1f52',
    artwork: 'monolith',
    glyphs: ['arc', 'grid', 'helix', 'vector', 'ring', 'shard', 'wave', 'node'],
  },
  {
    id: 'vertex',
    index: '02',
    name: 'Vertex',
    category: 'Luz cinética',
    price: 5280,
    tagline: 'A luz encontra um ângulo.',
    description:
      'Luminária de eixo duplo que reencontra o próprio equilíbrio a cada toque. A intensidade responde à inclinação, não a botões.',
    material: 'Latão escovado e vidro opala',
    edition: 'Edição de 120',
    accent: '#bef264',
    accentDeep: '#2b3312',
    artwork: 'bloom',
    glyphs: ['lens', 'stack', 'pulse', 'orbit', 'prism', 'arc', 'grid', 'vector'],
  },
  {
    id: 'nova',
    index: '03',
    name: 'Nova',
    category: 'Cronometria',
    price: 12600,
    tagline: 'Tempo medido em luz.',
    description:
      'Cronógrafo solar sem ponteiros. O disco interno gira uma volta completa por dia e marca as horas com uma fresta de luz.',
    material: 'Titânio jateado e safira',
    edition: 'Edição de 60',
    accent: '#fbbf24',
    accentDeep: '#3a2a08',
    artwork: 'solstice',
    glyphs: ['ring', 'orbit', 'prism', 'wave', 'node', 'cross', 'lens', 'pulse'],
  },
  {
    id: 'orbit',
    index: '04',
    name: 'Orbit',
    category: 'Escuta pessoal',
    price: 6750,
    tagline: 'Feito para desaparecer.',
    description:
      'Fone de referência com arco em fibra contínua. Sem parafusos, sem costura aparente — o peso some depois do primeiro minuto.',
    material: 'Fibra de carbono e couro nappa',
    edition: 'Edição de 300',
    accent: '#5eead4',
    accentDeep: '#0d3b36',
    artwork: 'orbit',
    glyphs: ['helix', 'wave', 'node', 'cross', 'shard', 'stack', 'ring', 'arc'],
  },
  {
    id: 'apex',
    index: '05',
    name: 'Apex',
    category: 'Imagem',
    price: 15200,
    tagline: 'Toda lente é uma decisão.',
    description:
      'Câmera modular de corpo único. Sensor, óptica e visor se recombinam sem ferramentas — o sistema muda de ideia com você.',
    material: 'Magnésio usinado',
    edition: 'Edição de 40',
    accent: '#fb7185',
    accentDeep: '#43121f',
    artwork: 'aperture',
    glyphs: ['prism', 'lens', 'shard', 'vector', 'grid', 'cross', 'orbit', 'pulse'],
  },
  {
    id: 'halo',
    index: '06',
    name: 'Halo',
    category: 'Atmosfera',
    price: 4320,
    tagline: 'O ar como material.',
    description:
      'Difusor de anel único que trabalha em silêncio absoluto. A névoa se forma na borda e cai — não sobe, não sopra.',
    material: 'Cerâmica polida',
    edition: 'Edição de 500',
    accent: '#93c5fd',
    accentDeep: '#152b4d',
    artwork: 'halo',
    glyphs: ['ring', 'arc', 'wave', 'lens', 'helix', 'stack', 'node', 'prism'],
  },
];

export const getProductById = (id: string): Product | undefined =>
  PRODUCTS.find((product) => product.id === id);
