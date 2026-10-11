import type { BulletinData } from '../types/database';
import { addDays, firstOfMonth, todayISO, upcomingSunday } from './utils';

/**
 * Sample bulletin shown when Supabase is not configured, unreachable, or a table is
 * still empty. Dates are relative to today so the demo always looks current.
 */
export function buildMockData(): BulletinData {
  const sun = upcomingSunday();
  const next = addDays(sun, 7);
  const month = firstOfMonth(todayISO());

  return {
    churchInfo: {
      id: 1,
      church_name: 'УВС БАПТИСТ ЧУУЛГАН',
      pastor: 'Ж.Билгүүн',
      issue_no: 41,
      issue_date: sun,
      phone: null,
      address: 'Увс аймаг, Улаангом хот',
      map_url: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Улаангом Увс аймаг'),
    },

    announcements: [
      {
        id: 'a1',
        title: 'Библийн нэгдсэн семинар',
        summary: 'Бүх гишүүдийг Ромын захидлын судалгааны семинарт урьж байна.',
        body:
          'Энэ сарын сүүлийн Бямба гарагт Ромын захидлын нэгдсэн семинар болно.\n\n' +
          '• Цаг: 10:00–15:00\n• Байршил: Их танхим\n• Өдрийн хоол чуулганаас\n\n' +
          'Бүртгүүлэхийг хүсвэл Ням гарагийн цуглааны дараа угталтын ширээнд нэрээ өгнө үү.',
        tag: 'featured',
        image_url: null,
        event_date: addDays(sun, 13),
        is_active: true,
        sort_order: 1,
      },
      {
        id: 'a2',
        title: 'Залуучуудын нөхөрлөл',
        summary: 'Баасан гарагт 18:30-д тоглоом, магтаал, Үгийн хуваалцлага.',
        body: 'Залуучуудын нөхөрлөл энэ Баасан гарагт 18:30-д 2 давхрын танхимд болно. Найзаа дагуулаад ирээрэй!',
        tag: 'this_week',
        image_url: null,
        event_date: addDays(sun, 5),
        is_active: true,
        sort_order: 2,
      },
      {
        id: 'a3',
        title: 'Өвлийн түлээ, нүүрсний тусламж',
        summary: 'Хэрэгцээтэй өрхүүдэд туслах өргөл цуглуулж байна.',
        body:
          'Өвөл ойртож байгаа тул хэрэгцээтэй гэр бүлүүдэд түлээ нүүрс хүргэх үйлчлэл эхэлж байна. ' +
          'Өргөлөө тусгай хайрцагт хийх эсвэл диаконуудад хандана уу.',
        tag: null,
        image_url: null,
        event_date: null,
        is_active: true,
        sort_order: 3,
      },
    ],

    verses: [
      {
        id: 'v0',
        reference: 'Дуулал 23:1',
        text: 'ЭЗЭН бол миний хоньчин. Би юугаар ч дутахгүй.',
        week_start: addDays(sun, -7),
      },
      {
        id: 'v1',
        reference: 'Дуулал 4:7',
        text: 'Тэдний тариа, шинэ дарс арвижсанаас ч илүү их баяр баясгаланг Та миний зүрхэнд өгсөн.',
        week_start: sun,
      },
      {
        id: 'v2',
        reference: 'Филиппой 4:13',
        text: 'Намайг хүчирхэгжүүлэгч Христ дотор би бүхнийг чадна.',
        week_start: next,
      },
      {
        id: 'v3',
        reference: 'Иохан 3:16',
        text:
          'Учир нь Бурхан ертөнцийг үнэхээр хайрласан тул цорын ганц Хүүгээ өгсөн билээ. ' +
          'Ингэснээр Түүнд итгэгч хэн боловч мөхөхгүй, харин мөнх амьтай болно.',
        week_start: addDays(sun, 14),
      },
    ],

    plans: [
      { id: 'p1', event_date: addDays(month, 3), title: 'Удирдагчдын хурал', time: '19:00', speaker: 'Ж.Билгүүн', location: 'Оффис', notes: null, category: 'service', end_date: null, group_name: null, image_url: null },
      { id: 'p2', event_date: sun, title: 'Эзний өдрийн цуглаан', time: '11:00', speaker: 'Ж.Билгүүн', location: 'Их танхим', notes: null, category: 'service', end_date: null, group_name: null, image_url: null },
      { id: 'p3', event_date: addDays(sun, 3), title: 'Бэлтгэл анги', time: '18:00', speaker: 'Б.Мөнх-Эрдэнэ', location: 'Бага танхим', notes: 'Баптисм хүртэх хүсэлтэй хүмүүст', category: 'service', end_date: null, group_name: null, image_url: null },
      { id: 'p4', event_date: addDays(sun, 13), title: 'Библийн нэгдсэн семинар', time: '10:00–15:00', speaker: 'Зочин багш', location: 'Их танхим', notes: null, category: 'seminar', end_date: addDays(sun, 18), group_name: null, image_url: null },
      { id: 'p5', event_date: addDays(sun, 14), title: 'Эзний зоог', time: '11:00', speaker: 'Ж.Билгүүн', location: 'Их танхим', notes: null, category: 'service', end_date: null, group_name: null, image_url: null },
      { id: 'p6', event_date: addDays(sun, 20), title: 'Ээжүүдийн тусгай уулзалт', time: '14:00', speaker: 'Д.Оюунаа', location: '2 давхар', notes: null, category: 'fellowship', end_date: null, group_name: null, image_url: null },
    ],

    duties: [
      { id: 'd1', week_date: sun, duty_type: 'kitchen', district: '21', assignees: null, notes: 'Цай, боорцог' },
      { id: 'd2', week_date: sun, duty_type: 'childcare', district: '13', assignees: 'Б.Сараа, Э.Номин', notes: '0–5 нас' },
      { id: 'd3', week_date: sun, duty_type: 'welcome', district: '12, 31', assignees: 'Г.Тэмүүлэн, Н.Ану', notes: null },
      { id: 'd4', week_date: sun, duty_type: 'scripture', district: null, assignees: 'Х.Батбаяр', notes: 'Дуулал 4' },
      { id: 'd5', week_date: next, duty_type: 'kitchen', district: '12, 31', assignees: null, notes: null },
      { id: 'd6', week_date: next, duty_type: 'childcare', district: '21', assignees: 'О.Хулан, С.Уянга', notes: null },
      { id: 'd7', week_date: next, duty_type: 'welcome', district: '13', assignees: 'Т.Билгүүнзаяа', notes: null },
      { id: 'd8', week_date: next, duty_type: 'scripture', district: null, assignees: 'Д.Энхжин', notes: 'Филиппой 4' },
    ],


    seminars: [],
    seminarDuties: [],
    planFiles: [],
  };
}
