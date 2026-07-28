const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAccounts() {
  console.log('--- TESTING SUPER ADMIN ---');
  const adminRes = await supabase.auth.signInWithPassword({
    email: 'riderhoodmotor@gmail.com',
    password: 'RiderHoodMotor1!',
  });

  if (adminRes.error) {
    console.log('Super admin login error:', adminRes.error.message);
  } else {
    console.log('Super admin logged in successfully! User ID:', adminRes.user.id);
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminRes.user.id)
      .single();
    console.log('Profile in DB:', profile);
  }

  console.log('\n--- TESTING WORKSHOP ADMIN ---');
  const shopRes = await supabase.auth.signInWithPassword({
    email: 'khairazizizi@gmail.com',
    password: 'WorkshopCmerlangTerbilang',
  });

  if (shopRes.error) {
    console.log('Workshop admin login error:', shopRes.error.message);
    if (shopRes.error.message.includes('Invalid login credentials')) {
      console.log('Attempting to create khairazizizi@gmail.com now...');
      const signUpRes = await supabase.auth.signUp({
        email: 'khairazizizi@gmail.com',
        password: 'WorkshopCmerlangTerbilang',
        options: {
          data: {
            full_name: 'Cemerlang Terbilang Workshop',
            role: 'workshop_admin',
          },
        },
      });
      if (signUpRes.error) {
        console.log('Sign up error:', signUpRes.error.message);
      } else {
        console.log('Workshop admin registered successfully!');
      }
    }
  } else {
    console.log('Workshop admin logged in successfully! User ID:', shopRes.user.id);
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', shopRes.user.id)
      .single();
    console.log('Profile in DB:', profile);
  }
}

testAccounts().catch(console.error);
