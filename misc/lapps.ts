import bitcoinBayIcon from 'assets/images/apps/bitcoinBay.png';
import bitcoinBounceIcon from 'assets/images/apps/bitcoinBounce.png';
import bitcoinSnakeIcon from 'assets/images/apps/bitcoinSnake.png';
import clubBitcoinIcon from 'assets/images/apps/clubBitcoin.png';
import coinClimber from 'assets/images/apps/coinclimber.png';
import lcrushIcon from 'assets/images/apps/lcrush.png';
import sarutobiIcon from 'assets/images/apps/sarutobi.png';
import tetroTilesIcon from 'assets/images/apps/tetroTiles.png';
import turbo84Icon from 'assets/images/apps/turbo84.png';
import {invoicePerm} from 'bridge/macaroon';
import {AppDetail} from 'types/index';

export const predefinedApps: AppDetail[] = [
  {
    connect: true,
    enableIos: false,
    appId: 'coinclimber',
    name: 'Coin Climber',
    category: 'game',
    author: 'Nayuta Inc.',
    homepage: 'https://play.google.com/store/apps/details?id=com.nayuta.coinclimber',
    icon: coinClimber,
    description: 'lapps:descCoinClimber',
    android: {
      packageId: 'com.nayuta.coinclimber',
      url: 'ncorelapps://link-lnd?host={host}&port={port}&macaroon={macaroonHex}&cert={cert}',
      mode: 'intent',
      protocol: 'rest',
      macaroonPermissions: invoicePerm.concat([{entity: 'info', action: 'read'}]),
    },
  },
  {
    connect: true,
    enableIos: false,
    appId: 'ncorelapps',
    name: 'Lightning Crush',
    category: 'game',
    author: 'MandelDuck',
    homepage: 'https://play.google.com/store/apps/details?id=com.hanseikai.LightningCrush',
    icon: lcrushIcon,
    description: 'lapps:descLightningCrush',
    android: {
      packageId: 'com.hanseikai.LightningCrush',
      url: 'ncorelapps://link-lnd?host={host}&port={port}&macaroon={macaroonHex}',
      mode: 'intent',
      protocol: 'rest',
      macaroonPermissions: invoicePerm.concat([
        {
          entity: 'peers',
          action: 'write',
        },
        {entity: 'info', action: 'read'},
      ]),
    },
  },
  {
    connect: true,
    enableIos: false,
    appId: 'sarutobi',
    name: 'SaruTobi',
    category: 'game',
    author: 'MandelDuck',
    homepage: 'http://www.mandelduck.com/sarutobi/',
    icon: sarutobiIcon,
    description: 'lapps:descSarutobi',
    android: {
      packageId: 'com.mandelduck.sarutobilightning',
      url: 'sarutobi://link-lnd?host={host}&port={port}&macaroon={macaroonHex}',
      mode: 'intent',
      protocol: 'rest',
      macaroonPermissions: invoicePerm.concat([
        {
          entity: 'peers',
          action: 'write',
        },
        {entity: 'info', action: 'read'},
      ]),
    },
  },
  {
    connect: false,
    enableIos: true,
    appId: 'tetroTiles',
    name: 'Tetro Tiles',
    category: 'game',
    author: '',
    homepage: 'https://tetro-tiles.sng.link/Dqwp1/y5du/hvfd',
    icon: tetroTilesIcon,
    description: '',
  },
  {
    connect: false,
    enableIos: true,
    appId: 'clubBitcoin',
    name: 'Club Bitcoin: Solitaire',
    category: 'game',
    author: '',
    homepage: 'https://bitcoin-solitaire.sng.link/Dx606/ksap/wtzy',
    icon: clubBitcoinIcon,
    description: '',
  },
  {
    connect: false,
    enableIos: true,
    appId: 'bitcoinBounce',
    name: 'Bitcoin Bounce',
    category: 'game',
    author: '',
    homepage: 'https://bitcoin-bounce.sng.link/Ddomi/gar7/tfyz',
    icon: bitcoinBounceIcon,
    description: '',
  },
  {
    connect: false,
    enableIos: true,
    appId: 'turbo84',
    name: 'Turbo 84',
    category: 'game',
    author: '',
    homepage: 'https://turbo84.sng.link/Dbgmr/wjrb/o3f5',
    icon: turbo84Icon,
    description: '',
  },
  {
    connect: false,
    enableIos: true,
    appId: 'bitcoinSnake',
    name: 'Bitcoin Snake',
    category: 'game',
    author: '',
    homepage: 'https://bitcoin-snake.sng.link/Diskp/m2th/z3g0',
    icon: bitcoinSnakeIcon,
    description: '',
  },
  {
    connect: false,
    enableIos: true,
    appId: 'bitcoinBay',
    name: 'Bitcoin Bay',
    category: 'game',
    author: '',
    homepage: 'https://thndr-bay.sng.link/Dk8fg/ulr2/4gwf',
    icon: bitcoinBayIcon,
    description: '',
  },
];

export default predefinedApps;
