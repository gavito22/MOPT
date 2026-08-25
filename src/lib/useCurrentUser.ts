import { ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

const session = ref<Session | null>(null)
const ready = ref(false)

export const authReady = supabase.auth.getSession().then(({ data }) => {
  session.value = data.session
  ready.value = true
})
supabase.auth.onAuthStateChange((_event, newSession) => {
  session.value = newSession
})

export function useCurrentUser() {
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, ready, signIn, signOut }
}
