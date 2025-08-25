
import type { Slide, Testimonial, FAQItem } from './types';
import { Grade } from './types';

export const NAV_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'About Us', path: '/about' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'FAQ', path: '/faq' },
  { name: 'Contact', path: '/contact' },
];

export const GRADES = Object.values(Grade);

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const WEEKDAY_MAP: { [key: string]: (typeof WEEKDAYS)[number] } = {
    MO: 'Monday',
    TU: 'Tuesday',
    WE: 'Wednesday',
    TH: 'Thursday',
    FR: 'Friday',
    SA: 'Saturday',
    SU: 'Sunday',
};

export const TIME_SLOTS = [
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:00 - 12:00',
    '12:00 - 13:00',
    '13:00 - 14:00',
    '14:00 - 15:00',
    '15:00 - 16:00',
    '16:00 - 17:00',
    '17:00 - 18:00',
    '18:00 - 19:00',
] as const;

export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo, Democratic Republic of the', 'Congo, Republic of the', 'Costa Rica', "Cote d'Ivoire", 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  "Lao People's Democratic Republic", 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia, Federated States of', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine State', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States of America', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Venezuela', 'Vietnam',
  'Yemen',
  'Zambia', 'Zimbabwe'
] as const;

export const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'IST (GMT+5:30) India' },
  { value: 'Europe/London', label: 'GMT/BST (GMT+0/1) London, Dublin' },
  { value: 'Europe/Berlin', label: 'CET/CEST (GMT+1/2) Berlin, Paris' },
  { value: 'Asia/Dubai', label: 'GST (GMT+4) Dubai' },
  { value: 'Asia/Singapore', label: 'SGT (GMT+8) Singapore' },
  { value: 'Australia/Sydney', label: 'AEST/AEDT (GMT+10/11) Sydney' },
  { value: 'America/New_York', label: 'ET (GMT-5/4) New York' },
  { value: 'America/Chicago', label: 'CT (GMT-6/5) Chicago' },
  { value: 'America/Denver', label: 'MT (GMT-7/6) Denver' },
  { value: 'America/Los_Angeles', label: 'PT (GMT-8/7) Los Angeles' },
  { value: 'Etc/GMT', label: 'GMT/UTC (GMT+0) Coordinated Universal Time' },
] as const;


export const CAROUSEL_SLIDES: Slide[] = [
  {
    image: 'https://picsum.photos/1920/1080?random=1',
    title: 'Embrace the Art of Bharatanatyam',
    subtitle: 'Join our classes to discover the rich tradition of classical Indian dance.',
  },
  {
    image: 'https://picsum.photos/1920/1080?random=2',
    title: 'Find Your Voice with Vocal Training',
    subtitle: 'Master the art of singing with our expert-led vocal courses.',
  },
  {
    image: 'https://picsum.photos/1920/1080?random=3',
    title: 'Unleash Your Creativity in Drawing',
    subtitle: 'From sketching to painting, our art classes cater to all skill levels.',
  },
  {
    image: 'https://picsum.photos/1920/1080?random=4',
    title: 'Sharpen Your Mind with Abacus',
    subtitle: 'Enhance mathematical skills and concentration with our abacus programs.',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Nadanaloga has been a transformative experience for my daughter. The teachers are so patient and skilled. Highly recommended!",
    author: 'Anitha Sharma',
    relation: 'Parent of a Bharatanatyam Student',
    image: 'https://picsum.photos/100/100?random=5',
  },
  {
    quote: "The vocal classes have boosted my confidence immensely. The curriculum is well-structured, and the environment is very supportive.",
    author: 'Rajesh Kumar',
    relation: 'Vocal Student',
    image: 'https://picsum.photos/100/100?random=6',
  },
  {
    quote: "I never thought I could draw, but the instructors at Nadanaloga made it so accessible and fun. I'm proud of what I've learned.",
    author: 'Priya Singh',
    relation: 'Drawing Student',
    image: 'https://picsum.photos/100/100?random=7',
  },
];

export const FAQ_DATA: FAQItem[] = [
    {
        question: "What are the age requirements for the classes?",
        answer: "Our classes cater to a wide range of age groups. Bharatanatyam and Abacus typically start from 5 years old. Vocal and Drawing classes are available for children aged 7 and above, as well as for adults. Please check specific course details for more information."
    },
    {
        question: "What is the fee structure?",
        answer: "Fees vary depending on the course, level, and whether you choose online or offline classes. We offer monthly and quarterly payment options. For a detailed fee structure, please contact our admissions office or fill out the inquiry form on our contact page."
    },
    {
        question: "Can I take a trial class?",
        answer: "Yes, we offer a paid trial class for most of our courses. This allows prospective students to experience our teaching style and class environment before committing to a full term. Please contact us to schedule a trial session."
    },
    {
        question: "What is the difference between online and offline classes?",
        answer: "Offline classes are conducted at our physical studios, offering direct interaction with instructors and peers. Online classes are conducted via live video conferencing, providing the flexibility to learn from anywhere. Both formats follow the same curriculum and are taught by our expert faculty."
    },
];

export const GALLERY_IMAGES = [
    'https://picsum.photos/600/400?random=10',
    'https://picsum.photos/600/400?random=11',
    'https://picsum.photos/600/400?random=12',
    'https://picsum.photos/600/400?random=13',
    'https://picsum.photos/600/400?random=14',
    'https://picsum.photos/600/400?random=15',
    'https://picsum.photos/600/400?random=16',
    'https://picsum.photos/600/400?random=17',
    'https://picsum.photos/600/400?random=18',
];
