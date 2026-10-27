/**
 * Central utility for commodity-accurate crop images
 * Maps crops to dedicated local assets in src/assets/images/
 */
export function resolveCropImage(cropName: string | undefined | null): string {
  if (!cropName) {
    return '/assets/images/crop-wheat.jpg';
  }

  const name = cropName.toLowerCase().trim();

  if (name.includes('rice') || name.includes('paddy') || name.includes('basmati') || name.includes('adt') || name.includes('ponni')) {
    return '/assets/images/crop-rice.jpg';
  }
  if (name.includes('wheat') || name.includes('sharbati') || name.includes('gehun') || name.includes('flour') || name.includes('atta')) {
    return '/assets/images/crop-wheat.jpg';
  }
  if (name.includes('tomato') || name.includes('tamatar')) {
    return '/assets/images/crop-tomato.jpg';
  }
  if (name.includes('onion') || name.includes('pyaz') || name.includes('nasik')) {
    return '/assets/images/crop-onion.jpg';
  }
  if (name.includes('potato') || name.includes('aloo') || name.includes('alu')) {
    return '/assets/images/crop-potato.jpg';
  }
  if (name.includes('banana') || name.includes('kela') || name.includes('plantain')) {
    return '/assets/images/crop-banana.jpg';
  }
  if (name.includes('chilli') || name.includes('chili') || name.includes('mirch') || name.includes('mirchi') || name.includes('capsicum')) {
    return '/assets/images/crop-chili.jpg';
  }
  if (name.includes('cotton') || name.includes('kapas')) {
    return '/assets/images/crop-cotton.jpg';
  }
  if (name.includes('groundnut') || name.includes('peanut') || name.includes('moongphali')) {
    return '/assets/images/crop-groundnut.jpg';
  }
  if (name.includes('maize') || name.includes('corn') || name.includes('makka')) {
    return '/assets/images/crop-maize.jpg';
  }
  if (name.includes('sugarcane') || name.includes('ganna') || name.includes('sugar')) {
    return '/assets/images/crop-sugarcane.jpg';
  }
  if (name.includes('turmeric') || name.includes('haldi')) {
    return '/assets/images/crop-turmeric.jpg';
  }

  if (name.includes('carrot') || name.includes('gajar')) {
    return '/assets/images/carrot.jpg';
  }
  if (name.includes('watermelon') || name.includes('tarbuj') || name.includes('water melon')) {
    return '/assets/images/watermelon.jpg';
  }
  if (name.includes('mango') || name.includes('aam')) {
    return '/assets/images/mango.jpg';
  }
  if (name.includes('apple') || name.includes('seb')) {
    return '/assets/images/apple.jpg';
  }
  if (name.includes('orange') || name.includes('santra') || name.includes('citrus')) {
    return '/assets/images/orange.jpg';
  }
  if (name.includes('grape') || name.includes('angoor')) {
    return '/assets/images/grapes.jpg';
  }
  if (name.includes('lemon') || name.includes('nimbu') || name.includes('lime')) {
    return '/assets/images/lemon.jpg';
  }
  if (name.includes('cabbage') || name.includes('patta')) {
    return '/assets/images/cabbage.jpg';
  }
  if (name.includes('cauliflower') || name.includes('gobhi') || name.includes('gobi')) {
    return '/assets/images/cauliflower.jpg';
  }
  if (name.includes('cucumber') || name.includes('kheera')) {
    return '/assets/images/cucumber.jpg';
  }
  if (name.includes('brinjal') || name.includes('eggplant') || name.includes('baingan')) {
    return '/assets/images/brinjal_eggplant.jpg';
  }
  if (name.includes('capsicum') || name.includes('bell pepper') || name.includes('shimla')) {
    return '/assets/images/capsicum_bell_pepper.jpg';
  }
  if (name.includes('beetroot') || name.includes('chukandar')) {
    return '/assets/images/beetroot.jpg';
  }
  if (name.includes('radish') || name.includes('mooli')) {
    return '/assets/images/radish_mooli.jpg';
  }
  if (name.includes('okra') || name.includes('ladyfinger') || name.includes('bhindi')) {
    return '/assets/images/okra_ladyfinger.jpg';
  }
  if (name.includes('garlic') || name.includes('lahsun')) {
    return '/assets/images/fresh_garlic.jpg';
  }
  if (name.includes('ginger') || name.includes('adrak')) {
    return '/assets/images/fresh_ginger.jpg';
  }
  if (name.includes('papaya') || name.includes('papita')) {
    return '/assets/images/papaya.jpg';
  }
  if (name.includes('pineapple') || name.includes('ananas')) {
    return '/assets/images/pineapple.jpg';
  }
  if (name.includes('pomegranate') || name.includes('anar')) {
    return '/assets/images/pomegranate.jpg';
  }
  if (name.includes('pumpkin') || name.includes('kaddu')) {
    return '/assets/images/pumpkin.jpg';
  }
  if (name.includes('spinach') || name.includes('palak')) {
    return '/assets/images/spinach_palak.jpg';
  }
  if (name.includes('coconut') || name.includes('nariyal')) {
    return '/assets/images/coconut.jpg';
  }
  if (name.includes('drumstick') || name.includes('moringa') || name.includes('sahjan')) {
    return '/assets/images/drumstick_moringa.jpg';
  }
  if (name.includes('pea') || name.includes('matar')) {
    return '/assets/images/green_peas.jpg';
  }
  if (name.includes('soybean') || name.includes('soya')) {
    return '/assets/images/soybean.jpg';
  }
  if (name.includes('mustard') || name.includes('sarson')) {
    return '/assets/images/mustard_seeds.jpg';
  }
  if (name.includes('chana') || name.includes('chickpea') || name.includes('gram') || name.includes('bengal gram')) {
    return '/assets/images/bengal_gram_chana.jpg';
  }
  if (name.includes('moong') || name.includes('mung')) {
    return '/assets/images/green_gram_moong.jpg';
  }
  if (name.includes('urad')) {
    return '/assets/images/black_gram_urad.jpg';
  }
  if (name.includes('toor') || name.includes('arhar') || name.includes('pigeon pea')) {
    return '/assets/images/pigeon_pea_toor_dal.jpg';
  }
  if (name.includes('coffee')) {
    return '/assets/images/coffee_beans.jpg';
  }
  if (name.includes('tea')) {
    return '/assets/images/tea_leaves.jpg';
  }
  if (name.includes('ragi') || name.includes('millet')) {
    return '/assets/images/finger_millet_ragi.jpg';
  }
  if (name.includes('barley') || name.includes('jau')) {
    return '/assets/images/barley.jpg';
  }
  if (name.includes('sweet potato') || name.includes('shakarkandi')) {
    return '/assets/images/sweet_potato.jpg';
  }
  if (name.includes('karela') || name.includes('bitter gourd')) {
    return '/assets/images/bitter_gourd_karela.jpg';
  }
  if (name.includes('lauki') || name.includes('bottle gourd')) {
    return '/assets/images/bottle_gourd_lauki.jpg';
  }
  if (name.includes('almond') || name.includes('badam')) {
    return '/assets/images/almonds_badam.jpg';
  }
  if (name.includes('cashew') || name.includes('kaju')) {
    return '/assets/images/cashew_nuts.jpg';
  }
  if (name.includes('walnut') || name.includes('akhrot')) {
    return '/assets/images/walnut_akhrot.jpg';
  }
  if (name.includes('coriander') || name.includes('dhaniya')) {
    return '/assets/images/coriander_leaves.jpg';
  }
  if (name.includes('cardamom') || name.includes('elaichi')) {
    return '/assets/images/cardamom_spices.jpg';
  }
  if (name.includes('clove') || name.includes('laung')) {
    return '/assets/images/cloves_laung.jpg';
  }
  if (name.includes('pepper') || name.includes('kali mirch')) {
    return '/assets/images/black_pepper.jpg';
  }

  // Fallback default
  return '/assets/images/crop-wheat.jpg';
}
