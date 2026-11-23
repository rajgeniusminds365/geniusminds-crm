"use client";

/**
 * Open wacrm's own contact detail sheet from a GM page, so a learner's
 * profile, notes, deals and WhatsApp history are one click away.
 */
import { useState } from "react";
import { ContactDetailView } from "@/components/contacts/contact-detail-view";

export function useContactSheet(onUpdated?: () => void) {
  const [contactId, setContactId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  return {
    openContact: (id: string) => {
      setContactId(id);
      setOpen(true);
    },
    sheet: <ContactDetailView open={open} onOpenChange={setOpen} contactId={contactId} onUpdated={onUpdated ?? (() => {})} />,
  };
}
