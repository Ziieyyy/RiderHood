const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function registerAccount(email, password, fullName, role) {
  console.log(`Registering / Syncing account: ${email} (${role})...`);
  
  // Try sign up first
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      console.log(`User ${email} already registered in Auth. Attempting sign in to verify credentials...`);
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.log(`Note for ${email}: Password in DB may differ or email confirmation required (${signInError.message}).`);
      } else {
        console.log(`Successfully signed in as ${email}!`);
        // Ensure profile role is updated
        if (signInData.user) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: role, status: 'active', full_name: fullName })
            .eq('id', signInData.user.id);
          if (updateError) {
            console.log(`Profile update error:`, updateError.message);
          } else {
            console.log(`Successfully set profile role to ${role} for ${email}!`);
          }
        }
      }
    } else {
      console.error(`Sign up error for ${email}:`, signUpError.message);
    }
  } else {
    console.log(`User ${email} successfully registered!`);
    if (signUpData.user) {
      // Force update profile table
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: signUpData.user.id,
          email: email,
          full_name: fullName,
          role: role,
          status: 'active',
        });
      if (profileErr) {
        console.log(`Profile upsert result:`, profileErr.message);
      } else {
        console.log(`Profile record successfully set to ${role}.`);
      }
    }
  }
}

async function main() {
  console.log('=== SEEDING RIDERHOOD ACCOUNTS ===');
  
  // 1. Super Admin Account
  await registerAccount(
    'riderhoodmotor@gmail.com',
    'RiderHoodMotor1!',
    'RiderHood Super Admin',
    'super_admin'
  );

  console.log('Waiting 5 seconds to bypass email rate limits...');
  await new Promise((r) => setTimeout(r, 5000));

  // 2. Workshop Admin Account
  await registerAccount(
    'khairazizizi@gmail.com',
    'WorkshopCmerlangTerbilang',
    'Cemerlang Terbilang Workshop',
    'workshop_admin'
  );

  console.log('=== DONE SEEDING ACCOUNTS ===');
}

main().catch(console.error);
