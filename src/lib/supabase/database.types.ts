
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "allergies": {
                  Row: {
                    "created_at": string,"id": string,"patient_id": string,"reaction": string | null,"recorded_by": string | null,"severity": string,"substance": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"patient_id": string,"reaction"?: string | null,"recorded_by"?: string | null,"severity"?: string,"substance": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"patient_id"?: string,"reaction"?: string | null,"recorded_by"?: string | null,"severity"?: string,"substance"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "allergies_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "allergies_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"appointments": {
                  Row: {
                    "cancellation_reason": string | null,"cancelled_by": string | null,"confirmed_at": string | null,"created_at": string,"created_by": string | null,"doctor_id": string,"ends_at": string,"id": string,"modality": Database["public"]['Enums']["appointment_modality"],"patient_id": string,"reason": string | null,"rescheduled_from": string | null,"starts_at": string,"status": Database["public"]['Enums']["appointment_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancellation_reason"?: string | null,"cancelled_by"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"doctor_id": string,"ends_at": string,"id"?: string,"modality": Database["public"]['Enums']["appointment_modality"],"patient_id": string,"reason"?: string | null,"rescheduled_from"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["appointment_status"],"updated_at"?: string
                  }
                  Update: {
                    "cancellation_reason"?: string | null,"cancelled_by"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"doctor_id"?: string,"ends_at"?: string,"id"?: string,"modality"?: Database["public"]['Enums']["appointment_modality"],"patient_id"?: string,"reason"?: string | null,"rescheduled_from"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["appointment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_rescheduled_from_fkey"
      columns: ["rescheduled_from"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_role": Database["public"]['Enums']["user_role"] | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": number,"metadata": NonNullable<Json>,"subject_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_role"?: Database["public"]['Enums']["user_role"] | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: never,"metadata"?: NonNullable<Json>,"subject_user_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_role"?: Database["public"]['Enums']["user_role"] | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"subject_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_subject_user_id_fkey"
      columns: ["subject_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"care_invitations": {
                  Row: {
                    "created_at": string,"doctor_id": string,"email": string,"expires_at": string,"id": string,"responded_at": string | null,"status": Database["public"]['Enums']["invitation_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"doctor_id": string,"email": string,"expires_at"?: string,"id"?: string,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["invitation_status"]
                  }
                  Update: {
                    "created_at"?: string,"doctor_id"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["invitation_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "care_invitations_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    }
                  ]
                },"care_relationships": {
                  Row: {
                    "activated_at": string | null,"consent_updated_at": string,"created_at": string,"doctor_id": string,"id": string,"patient_id": string,"revoked_at": string | null,"revoked_by": string | null,"share_documents": boolean,"share_history": boolean,"status": Database["public"]['Enums']["care_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"consent_updated_at"?: string,"created_at"?: string,"doctor_id": string,"id"?: string,"patient_id": string,"revoked_at"?: string | null,"revoked_by"?: string | null,"share_documents"?: boolean,"share_history"?: boolean,"status"?: Database["public"]['Enums']["care_status"]
                  }
                  Update: {
                    "activated_at"?: string | null,"consent_updated_at"?: string,"created_at"?: string,"doctor_id"?: string,"id"?: string,"patient_id"?: string,"revoked_at"?: string | null,"revoked_by"?: string | null,"share_documents"?: boolean,"share_history"?: boolean,"status"?: Database["public"]['Enums']["care_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "care_relationships_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "care_relationships_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "care_relationships_revoked_by_fkey"
      columns: ["revoked_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clinic_members": {
                  Row: {
                    "clinic_id": string,"created_at": string,"doctor_id": string,"member_role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clinic_id": string,"created_at"?: string,"doctor_id": string,"member_role"?: string
                  }
                  Update: {
                    "clinic_id"?: string,"created_at"?: string,"doctor_id"?: string,"member_role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clinic_members_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinic_members_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    }
                  ]
                },"clinical_notes": {
                  Row: {
                    "consultation_id": string | null,"content": string,"created_at": string,"doctor_id": string,"id": string,"patient_id": string,"shared_with_patient": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consultation_id"?: string | null,"content": string,"created_at"?: string,"doctor_id": string,"id"?: string,"patient_id": string,"shared_with_patient"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "consultation_id"?: string | null,"content"?: string,"created_at"?: string,"doctor_id"?: string,"id"?: string,"patient_id"?: string,"shared_with_patient"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clinical_notes_consultation_id_fkey"
      columns: ["consultation_id"]
isOneToOne: false
      referencedRelation: "consultations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinical_notes_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinical_notes_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"clinics": {
                  Row: {
                    "cnpj": string | null,"created_at": string,"id": string,"name": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cnpj"?: string | null,"created_at"?: string,"id"?: string,"name": string,"owner_id": string
                  }
                  Update: {
                    "cnpj"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clinics_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"consultations": {
                  Row: {
                    "appointment_id": string | null,"created_at": string,"doctor_id": string,"follow_up_date": string | null,"follow_up_notes": string | null,"id": string,"occurred_at": string,"patient_id": string,"reason": string | null,"summary_for_patient": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_id"?: string | null,"created_at"?: string,"doctor_id": string,"follow_up_date"?: string | null,"follow_up_notes"?: string | null,"id"?: string,"occurred_at"?: string,"patient_id": string,"reason"?: string | null,"summary_for_patient"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "appointment_id"?: string | null,"created_at"?: string,"doctor_id"?: string,"follow_up_date"?: string | null,"follow_up_notes"?: string | null,"id"?: string,"occurred_at"?: string,"patient_id"?: string,"reason"?: string | null,"summary_for_patient"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consultations_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: true
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consultations_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consultations_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "appointment_id": string | null,"created_at": string,"doctor_id": string,"id": string,"last_message_at": string,"patient_id": string,"subject": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_id"?: string | null,"created_at"?: string,"doctor_id": string,"id"?: string,"last_message_at"?: string,"patient_id": string,"subject"?: string
                  }
                  Update: {
                    "appointment_id"?: string | null,"created_at"?: string,"doctor_id"?: string,"id"?: string,"last_message_at"?: string,"patient_id"?: string,"subject"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"data_subject_requests": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"kind": Database["public"]['Enums']["dsr_kind"],"resolution_notes": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": Database["public"]['Enums']["dsr_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["dsr_kind"],"resolution_notes"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["dsr_status"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["dsr_kind"],"resolution_notes"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["dsr_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "data_subject_requests_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "data_subject_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"dispensations": {
                  Row: {
                    "dispensed_at": string,"id": string,"notes": string | null,"pharmacist_crf": string,"pharmacist_name": string,"pharmacy_id": string,"prescription_id": string,"registered_by": string,"request_id": string | null,"signature_legally_valid": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "dispensed_at"?: string,"id"?: string,"notes"?: string | null,"pharmacist_crf": string,"pharmacist_name": string,"pharmacy_id": string,"prescription_id": string,"registered_by": string,"request_id"?: string | null,"signature_legally_valid": boolean
                  }
                  Update: {
                    "dispensed_at"?: string,"id"?: string,"notes"?: string | null,"pharmacist_crf"?: string,"pharmacist_name"?: string,"pharmacy_id"?: string,"prescription_id"?: string,"registered_by"?: string,"request_id"?: string | null,"signature_legally_valid"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "dispensations_pharmacy_id_fkey"
      columns: ["pharmacy_id"]
isOneToOne: false
      referencedRelation: "pharmacies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dispensations_prescription_id_fkey"
      columns: ["prescription_id"]
isOneToOne: false
      referencedRelation: "prescriptions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dispensations_registered_by_fkey"
      columns: ["registered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dispensations_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "pharmacy_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"doctor_availability": {
                  Row: {
                    "created_at": string,"doctor_id": string,"end_time": string,"id": string,"modality": Database["public"]['Enums']["appointment_modality"],"slot_minutes": number,"start_time": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"doctor_id": string,"end_time": string,"id"?: string,"modality"?: Database["public"]['Enums']["appointment_modality"],"slot_minutes"?: number,"start_time": string,"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"doctor_id"?: string,"end_time"?: string,"id"?: string,"modality"?: Database["public"]['Enums']["appointment_modality"],"slot_minutes"?: number,"start_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "doctor_availability_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    }
                  ]
                },"doctor_tasks": {
                  Row: {
                    "created_at": string,"doctor_id": string,"done": boolean,"due_date": string | null,"id": string,"notes": string | null,"patient_id": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"doctor_id": string,"done"?: boolean,"due_date"?: string | null,"id"?: string,"notes"?: string | null,"patient_id"?: string | null,"title": string
                  }
                  Update: {
                    "created_at"?: string,"doctor_id"?: string,"done"?: boolean,"due_date"?: string | null,"id"?: string,"notes"?: string | null,"patient_id"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "doctor_tasks_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doctor_tasks_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"doctors": {
                  Row: {
                    "accepting_new_patients": boolean,"bio": string | null,"city": string | null,"created_at": string,"crm": string,"crm_state": string,"id": string,"messaging_enabled": boolean,"modalities": (Database["public"]['Enums']["appointment_modality"])[],"rqe": string | null,"specialty": string,"state": string | null,"updated_at": string,"verification_status": Database["public"]['Enums']["verification_status"],"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepting_new_patients"?: boolean,"bio"?: string | null,"city"?: string | null,"created_at"?: string,"crm": string,"crm_state": string,"id": string,"messaging_enabled"?: boolean,"modalities"?: (Database["public"]['Enums']["appointment_modality"])[],"rqe"?: string | null,"specialty": string,"state"?: string | null,"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null
                  }
                  Update: {
                    "accepting_new_patients"?: boolean,"bio"?: string | null,"city"?: string | null,"created_at"?: string,"crm"?: string,"crm_state"?: string,"id"?: string,"messaging_enabled"?: boolean,"modalities"?: (Database["public"]['Enums']["appointment_modality"])[],"rqe"?: string | null,"specialty"?: string,"state"?: string | null,"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "doctors_id_fkey"
      columns: ["id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"mime_type": string,"patient_id": string,"size_bytes": number,"storage_path": string,"title": string,"uploaded_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"mime_type": string,"patient_id": string,"size_bytes": number,"storage_path": string,"title": string,"uploaded_by": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"mime_type"?: string,"patient_id"?: string,"size_bytes"?: number,"storage_path"?: string,"title"?: string,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"dose_logs": {
                  Row: {
                    "id": string,"logged_at": string,"note": string | null,"patient_id": string,"patient_medication_id": string,"scheduled_for": string,"status": Database["public"]['Enums']["dose_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"logged_at"?: string,"note"?: string | null,"patient_id": string,"patient_medication_id": string,"scheduled_for": string,"status": Database["public"]['Enums']["dose_status"]
                  }
                  Update: {
                    "id"?: string,"logged_at"?: string,"note"?: string | null,"patient_id"?: string,"patient_medication_id"?: string,"scheduled_for"?: string,"status"?: Database["public"]['Enums']["dose_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "dose_logs_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dose_logs_patient_medication_id_fkey"
      columns: ["patient_medication_id"]
isOneToOne: false
      referencedRelation: "patient_medications"
      referencedColumns: ["id"]
    }
                  ]
                },"favorites": {
                  Row: {
                    "created_at": string,"target_id": string,"target_type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"target_id": string,"target_type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"target_id"?: string,"target_type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"medications": {
                  Row: {
                    "active_ingredient": string | null,"created_at": string,"dosage_form": string | null,"id": string,"is_antimicrobial": boolean,"name": string,"presentation": string,"requires_special_control": boolean,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_ingredient"?: string | null,"created_at"?: string,"dosage_form"?: string | null,"id"?: string,"is_antimicrobial"?: boolean,"name": string,"presentation": string,"requires_special_control"?: boolean,"source"?: string
                  }
                  Update: {
                    "active_ingredient"?: string | null,"created_at"?: string,"dosage_form"?: string | null,"id"?: string,"is_antimicrobial"?: boolean,"name"?: string,"presentation"?: string,"requires_special_control"?: boolean,"source"?: string
                  }
                  Relationships: [
                    
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"document_id": string | null,"id": string,"read_at": string | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"document_id"?: string | null,"id"?: string,"read_at"?: string | null,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"document_id"?: string | null,"id"?: string,"read_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"kind": string,"link": string | null,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"link"?: string | null,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"patient_medications": {
                  Row: {
                    "created_at": string,"dosage": string | null,"end_date": string | null,"frequency": string | null,"id": string,"instructions": string | null,"name": string,"patient_id": string,"prescription_id": string | null,"prescription_item_id": string | null,"presentation": string | null,"reminders_enabled": boolean,"schedule_times": (string)[],"source": Database["public"]['Enums']["medication_source"],"start_date": string,"status": Database["public"]['Enums']["medication_status"],"treatment_label": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dosage"?: string | null,"end_date"?: string | null,"frequency"?: string | null,"id"?: string,"instructions"?: string | null,"name": string,"patient_id": string,"prescription_id"?: string | null,"prescription_item_id"?: string | null,"presentation"?: string | null,"reminders_enabled"?: boolean,"schedule_times"?: (string)[],"source"?: Database["public"]['Enums']["medication_source"],"start_date"?: string,"status"?: Database["public"]['Enums']["medication_status"],"treatment_label"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"dosage"?: string | null,"end_date"?: string | null,"frequency"?: string | null,"id"?: string,"instructions"?: string | null,"name"?: string,"patient_id"?: string,"prescription_id"?: string | null,"prescription_item_id"?: string | null,"presentation"?: string | null,"reminders_enabled"?: boolean,"schedule_times"?: (string)[],"source"?: Database["public"]['Enums']["medication_source"],"start_date"?: string,"status"?: Database["public"]['Enums']["medication_status"],"treatment_label"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_medications_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "patient_medications_prescription_id_fkey"
      columns: ["prescription_id"]
isOneToOne: false
      referencedRelation: "prescriptions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "patient_medications_prescription_item_id_fkey"
      columns: ["prescription_item_id"]
isOneToOne: false
      referencedRelation: "prescription_items"
      referencedColumns: ["id"]
    }
                  ]
                },"patients": {
                  Row: {
                    "birth_date": string | null,"city": string | null,"cpf": string | null,"created_at": string,"emergency_contact_name": string | null,"emergency_contact_phone": string | null,"id": string,"phone": string | null,"sex": string | null,"state": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "birth_date"?: string | null,"city"?: string | null,"cpf"?: string | null,"created_at"?: string,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"id": string,"phone"?: string | null,"sex"?: string | null,"state"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "birth_date"?: string | null,"city"?: string | null,"cpf"?: string | null,"created_at"?: string,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"id"?: string,"phone"?: string | null,"sex"?: string | null,"state"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patients_id_fkey"
      columns: ["id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"created_at": string,"id": string,"paid_at": string | null,"provider": string,"provider_reference": string | null,"recorded_by": string | null,"status": Database["public"]['Enums']["payment_status"],"subscription_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"id"?: string,"paid_at"?: string | null,"provider"?: string,"provider_reference"?: string | null,"recorded_by"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"subscription_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"id"?: string,"paid_at"?: string | null,"provider"?: string,"provider_reference"?: string | null,"recorded_by"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"subscription_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"pharmacies": {
                  Row: {
                    "address_line": string,"afe_number": string,"city": string,"cnpj": string,"created_at": string,"district": string | null,"id": string,"latitude": number | null,"legal_name": string,"longitude": number | null,"opening_hours": string | null,"owner_id": string,"phone": string | null,"postal_code": string | null,"state": string,"technical_responsible": string,"technical_responsible_crf": string,"trade_name": string,"updated_at": string,"verification_status": Database["public"]['Enums']["verification_status"],"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line": string,"afe_number": string,"city": string,"cnpj": string,"created_at"?: string,"district"?: string | null,"id"?: string,"latitude"?: number | null,"legal_name": string,"longitude"?: number | null,"opening_hours"?: string | null,"owner_id": string,"phone"?: string | null,"postal_code"?: string | null,"state": string,"technical_responsible": string,"technical_responsible_crf": string,"trade_name": string,"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null
                  }
                  Update: {
                    "address_line"?: string,"afe_number"?: string,"city"?: string,"cnpj"?: string,"created_at"?: string,"district"?: string | null,"id"?: string,"latitude"?: number | null,"legal_name"?: string,"longitude"?: number | null,"opening_hours"?: string | null,"owner_id"?: string,"phone"?: string | null,"postal_code"?: string | null,"state"?: string,"technical_responsible"?: string,"technical_responsible_crf"?: string,"trade_name"?: string,"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pharmacies_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pharmacy_inventory": {
                  Row: {
                    "created_at": string,"ean": string | null,"id": string,"medication_id": string | null,"pharmacy_id": string,"presentation": string | null,"product_name": string,"quantity": number,"source": string,"stock_status": Database["public"]['Enums']["stock_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ean"?: string | null,"id"?: string,"medication_id"?: string | null,"pharmacy_id": string,"presentation"?: string | null,"product_name": string,"quantity"?: number,"source"?: string,"stock_status"?: Database["public"]['Enums']["stock_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ean"?: string | null,"id"?: string,"medication_id"?: string | null,"pharmacy_id"?: string,"presentation"?: string | null,"product_name"?: string,"quantity"?: number,"source"?: string,"stock_status"?: Database["public"]['Enums']["stock_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pharmacy_inventory_medication_id_fkey"
      columns: ["medication_id"]
isOneToOne: false
      referencedRelation: "medications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pharmacy_inventory_pharmacy_id_fkey"
      columns: ["pharmacy_id"]
isOneToOne: false
      referencedRelation: "pharmacies"
      referencedColumns: ["id"]
    }
                  ]
                },"pharmacy_members": {
                  Row: {
                    "created_at": string,"member_role": Database["public"]['Enums']["pharmacy_member_role"],"pharmacy_id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"member_role"?: Database["public"]['Enums']["pharmacy_member_role"],"pharmacy_id": string,"profile_id": string
                  }
                  Update: {
                    "created_at"?: string,"member_role"?: Database["public"]['Enums']["pharmacy_member_role"],"pharmacy_id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pharmacy_members_pharmacy_id_fkey"
      columns: ["pharmacy_id"]
isOneToOne: false
      referencedRelation: "pharmacies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pharmacy_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pharmacy_request_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"id": string,"note": string | null,"request_id": string,"status": Database["public"]['Enums']["pharmacy_request_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"id"?: string,"note"?: string | null,"request_id": string,"status": Database["public"]['Enums']["pharmacy_request_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"id"?: string,"note"?: string | null,"request_id"?: string,"status"?: Database["public"]['Enums']["pharmacy_request_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "pharmacy_request_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pharmacy_request_events_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "pharmacy_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"pharmacy_requests": {
                  Row: {
                    "created_at": string,"id": string,"items_description": string | null,"patient_id": string,"patient_note": string | null,"pharmacy_id": string,"pharmacy_note": string | null,"prescription_id": string | null,"status": Database["public"]['Enums']["pharmacy_request_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"items_description"?: string | null,"patient_id": string,"patient_note"?: string | null,"pharmacy_id": string,"pharmacy_note"?: string | null,"prescription_id"?: string | null,"status"?: Database["public"]['Enums']["pharmacy_request_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"items_description"?: string | null,"patient_id"?: string,"patient_note"?: string | null,"pharmacy_id"?: string,"pharmacy_note"?: string | null,"prescription_id"?: string | null,"status"?: Database["public"]['Enums']["pharmacy_request_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pharmacy_requests_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pharmacy_requests_pharmacy_id_fkey"
      columns: ["pharmacy_id"]
isOneToOne: false
      referencedRelation: "pharmacies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pharmacy_requests_prescription_id_fkey"
      columns: ["prescription_id"]
isOneToOne: false
      referencedRelation: "prescriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "audience": Database["public"]['Enums']["plan_audience"],"billing_interval": string,"custom_pricing": boolean,"description": string,"features": (string)[],"id": string,"is_active": boolean,"name": string,"price_max_cents": number | null,"price_min_cents": number | null,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience": Database["public"]['Enums']["plan_audience"],"billing_interval"?: string,"custom_pricing"?: boolean,"description"?: string,"features"?: (string)[],"id"?: string,"is_active"?: boolean,"name": string,"price_max_cents"?: number | null,"price_min_cents"?: number | null,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "audience"?: Database["public"]['Enums']["plan_audience"],"billing_interval"?: string,"custom_pricing"?: boolean,"description"?: string,"features"?: (string)[],"id"?: string,"is_active"?: boolean,"name"?: string,"price_max_cents"?: number | null,"price_min_cents"?: number | null,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_settings": {
                  Row: {
                    "description": string | null,"is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "platform_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"prescription_items": {
                  Row: {
                    "continuous_use": boolean,"created_at": string,"dosage": string,"duration_days": number | null,"frequency": string,"id": string,"instructions": string | null,"medication_id": string | null,"medication_name": string,"position": number,"prescription_id": string,"presentation": string | null,"quantity": string | null,"route": string | null,"schedule_times": (string)[],"times_per_day": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "continuous_use"?: boolean,"created_at"?: string,"dosage": string,"duration_days"?: number | null,"frequency": string,"id"?: string,"instructions"?: string | null,"medication_id"?: string | null,"medication_name": string,"position"?: number,"prescription_id": string,"presentation"?: string | null,"quantity"?: string | null,"route"?: string | null,"schedule_times"?: (string)[],"times_per_day"?: number | null
                  }
                  Update: {
                    "continuous_use"?: boolean,"created_at"?: string,"dosage"?: string,"duration_days"?: number | null,"frequency"?: string,"id"?: string,"instructions"?: string | null,"medication_id"?: string | null,"medication_name"?: string,"position"?: number,"prescription_id"?: string,"presentation"?: string | null,"quantity"?: string | null,"route"?: string | null,"schedule_times"?: (string)[],"times_per_day"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "prescription_items_medication_id_fkey"
      columns: ["medication_id"]
isOneToOne: false
      referencedRelation: "medications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescription_items_prescription_id_fkey"
      columns: ["prescription_id"]
isOneToOne: false
      referencedRelation: "prescriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"prescription_pharmacy_access": {
                  Row: {
                    "accessed_at": string,"accessed_by": string,"id": string,"pharmacy_id": string,"prescription_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accessed_at"?: string,"accessed_by": string,"id"?: string,"pharmacy_id": string,"prescription_id": string
                  }
                  Update: {
                    "accessed_at"?: string,"accessed_by"?: string,"id"?: string,"pharmacy_id"?: string,"prescription_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "prescription_pharmacy_access_accessed_by_fkey"
      columns: ["accessed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescription_pharmacy_access_pharmacy_id_fkey"
      columns: ["pharmacy_id"]
isOneToOne: false
      referencedRelation: "pharmacies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescription_pharmacy_access_prescription_id_fkey"
      columns: ["prescription_id"]
isOneToOne: false
      referencedRelation: "prescriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"prescriptions": {
                  Row: {
                    "cancellation_reason": string | null,"cancelled_at": string | null,"consultation_id": string | null,"content_hash": string | null,"created_at": string,"dispensed_at": string | null,"doctor_id": string,"general_instructions": string | null,"id": string,"issued_at": string | null,"kind": Database["public"]['Enums']["prescription_kind"],"patient_id": string,"signature_legally_valid": boolean,"signature_provider": string | null,"signature_reference": string | null,"signed_at": string | null,"status": Database["public"]['Enums']["prescription_status"],"submitted_at": string | null,"updated_at": string,"valid_until": string | null,"verification_code": string | null,"prescription_payload_for_pharmacy": Json | null
                  }
                  ComputedFields: "prescription_payload_for_pharmacy"
                  Insert: {
                    "cancellation_reason"?: string | null,"cancelled_at"?: string | null,"consultation_id"?: string | null,"content_hash"?: string | null,"created_at"?: string,"dispensed_at"?: string | null,"doctor_id": string,"general_instructions"?: string | null,"id"?: string,"issued_at"?: string | null,"kind"?: Database["public"]['Enums']["prescription_kind"],"patient_id": string,"signature_legally_valid"?: boolean,"signature_provider"?: string | null,"signature_reference"?: string | null,"signed_at"?: string | null,"status"?: Database["public"]['Enums']["prescription_status"],"submitted_at"?: string | null,"updated_at"?: string,"valid_until"?: string | null,"verification_code"?: string | null
                  }
                  Update: {
                    "cancellation_reason"?: string | null,"cancelled_at"?: string | null,"consultation_id"?: string | null,"content_hash"?: string | null,"created_at"?: string,"dispensed_at"?: string | null,"doctor_id"?: string,"general_instructions"?: string | null,"id"?: string,"issued_at"?: string | null,"kind"?: Database["public"]['Enums']["prescription_kind"],"patient_id"?: string,"signature_legally_valid"?: boolean,"signature_provider"?: string | null,"signature_reference"?: string | null,"signed_at"?: string | null,"status"?: Database["public"]['Enums']["prescription_status"],"submitted_at"?: string | null,"updated_at"?: string,"valid_until"?: string | null,"verification_code"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "prescriptions_consultation_id_fkey"
      columns: ["consultation_id"]
isOneToOne: false
      referencedRelation: "consultations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescriptions_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescriptions_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"full_name": string,"id": string,"onboarding_completed": boolean,"preferences": NonNullable<Json>,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"full_name"?: string,"id": string,"onboarding_completed"?: boolean,"preferences"?: NonNullable<Json>,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"onboarding_completed"?: boolean,"preferences"?: NonNullable<Json>,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "hits"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reminders": {
                  Row: {
                    "all_day": boolean,"created_at": string,"description": string | null,"done": boolean,"id": string,"patient_id": string,"starts_at": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day"?: boolean,"created_at"?: string,"description"?: string | null,"done"?: boolean,"id"?: string,"patient_id": string,"starts_at": string,"title": string
                  }
                  Update: {
                    "all_day"?: boolean,"created_at"?: string,"description"?: string | null,"done"?: boolean,"id"?: string,"patient_id"?: string,"starts_at"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminders_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"schedule_blocks": {
                  Row: {
                    "created_at": string,"doctor_id": string,"ends_at": string,"id": string,"reason": string | null,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"doctor_id": string,"ends_at": string,"id"?: string,"reason"?: string | null,"starts_at": string
                  }
                  Update: {
                    "created_at"?: string,"doctor_id"?: string,"ends_at"?: string,"id"?: string,"reason"?: string | null,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "schedule_blocks_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "amount_cents": number,"canceled_at": string | null,"created_at": string,"current_period_end": string | null,"id": string,"plan_id": string,"profile_id": string,"provider": string,"provider_reference": string | null,"started_at": string | null,"status": Database["public"]['Enums']["subscription_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents"?: number,"canceled_at"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"id"?: string,"plan_id": string,"profile_id": string,"provider"?: string,"provider_reference"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"canceled_at"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"id"?: string,"plan_id"?: string,"profile_id"?: string,"provider"?: string,"provider_reference"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"support_tickets": {
                  Row: {
                    "admin_response": string | null,"body": string,"category": string,"created_at": string,"id": string,"priority": string,"requester_id": string,"responded_by": string | null,"status": Database["public"]['Enums']["ticket_status"],"subject": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_response"?: string | null,"body": string,"category"?: string,"created_at"?: string,"id"?: string,"priority"?: string,"requester_id": string,"responded_by"?: string | null,"status"?: Database["public"]['Enums']["ticket_status"],"subject": string,"updated_at"?: string
                  }
                  Update: {
                    "admin_response"?: string | null,"body"?: string,"category"?: string,"created_at"?: string,"id"?: string,"priority"?: string,"requester_id"?: string,"responded_by"?: string | null,"status"?: Database["public"]['Enums']["ticket_status"],"subject"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "support_tickets_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "support_tickets_responded_by_fkey"
      columns: ["responded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"verification_requests": {
                  Row: {
                    "applicant_notes": string | null,"created_at": string,"document_paths": (string)[],"id": string,"reviewed_at": string | null,"reviewed_by": string | null,"reviewer_notes": string | null,"status": Database["public"]['Enums']["verification_status"],"subject_id": string,"subject_type": string,"submitted_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "applicant_notes"?: string | null,"created_at"?: string,"document_paths"?: (string)[],"id"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"reviewer_notes"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"subject_id": string,"subject_type": string,"submitted_by": string
                  }
                  Update: {
                    "applicant_notes"?: string | null,"created_at"?: string,"document_paths"?: (string)[],"id"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"reviewer_notes"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"subject_id"?: string,"subject_type"?: string,"submitted_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "verification_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_requests_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_log_action":
{ Args: { "p_action": string,"p_entity_id": string,"p_entity_type": string,"p_metadata"?: Json }; Returns: undefined
                           },
"admin_metrics":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_record_payment":
{ Args: { "p_amount_cents": number,"p_reference"?: string,"p_status": Database["public"]['Enums']["payment_status"],"p_subscription": string }; Returns: string
                           },
"admin_resolve_dsr":
{ Args: { "p_id": string,"p_notes": string,"p_status": Database["public"]['Enums']["dsr_status"] }; Returns: undefined
                           },
"admin_respond_ticket":
{ Args: { "p_id": string,"p_response": string,"p_status": Database["public"]['Enums']["ticket_status"] }; Returns: undefined
                           },
"admin_review_verification":
{ Args: { "p_approve": boolean,"p_notes"?: string,"p_request": string }; Returns: undefined
                           },
"admin_set_subscription_status":
{ Args: { "p_amount_cents"?: number,"p_id": string,"p_period_end"?: string,"p_status": Database["public"]['Enums']["subscription_status"] }; Returns: undefined
                           },
"admin_update_plan":
{ Args: { "p_description": string,"p_id": string,"p_is_active": boolean,"p_price_max_cents": number,"p_price_min_cents": number }; Returns: undefined
                           },
"admin_update_setting":
{ Args: { "p_key": string,"p_value": Json }; Returns: undefined
                           },
"assert_admin":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"can_view_prescription":
{ Args: { "p_prescription": string }; Returns: boolean
                           },
"can_view_profile":
{ Args: { "p_target": string }; Returns: boolean
                           },
"cancel_my_subscription":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"cancel_prescription":
{ Args: { "p_id": string,"p_reason": string }; Returns: undefined
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"choose_plan":
{ Args: { "p_slug": string }; Returns: string
                           },
"complete_doctor_onboarding":
{ Args: { "p_bio": string,"p_city": string,"p_crm": string,"p_crm_state": string,"p_document_paths": (string)[],"p_full_name": string,"p_modalities": (Database["public"]['Enums']["appointment_modality"])[],"p_rqe": string,"p_specialty": string,"p_state": string }; Returns: string
                           },
"complete_patient_onboarding":
{ Args: { "p_birth_date": string,"p_city": string,"p_cpf"?: string,"p_full_name": string,"p_phone": string,"p_sex"?: string,"p_state": string }; Returns: undefined
                           },
"complete_pharmacy_onboarding":
{ Args: { "p_address_line": string,"p_afe_number": string,"p_city": string,"p_cnpj": string,"p_district": string,"p_document_paths": (string)[],"p_full_name": string,"p_latitude": number,"p_legal_name": string,"p_longitude": number,"p_opening_hours": string,"p_phone": string,"p_postal_code": string,"p_state": string,"p_technical_responsible": string,"p_technical_responsible_crf": string,"p_trade_name": string }; Returns: string
                           },
"compute_prescription_hash":
{ Args: { "p_id": string }; Returns: string
                           },
"create_pharmacy_request":
{ Args: { "p_items_description": string,"p_note"?: string,"p_pharmacy": string,"p_prescription": string }; Returns: string
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"current_verified_pharmacy":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"doctor_schedule_appointment":
{ Args: { "p_duration_minutes": number,"p_modality": Database["public"]['Enums']["appointment_modality"],"p_patient": string,"p_reason"?: string,"p_starts_at": string }; Returns: string
                           },
"doctor_update_appointment":
{ Args: { "p_action": string,"p_id": string,"p_reason"?: string }; Returns: undefined
                           },
"enforce_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: undefined
                           },
"expire_prescriptions":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"export_my_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"finalize_prescription_issue":
{ Args: { "p_actor": string,"p_id": string,"p_legally_valid": boolean,"p_provider": string,"p_reference": string,"p_signed_hash": string }; Returns: string
                           },
"get_available_slots":
{ Args: { "p_days"?: number,"p_doctor": string,"p_from"?: string }; Returns: {
              "ends_at": string,"modality": Database["public"]['Enums']["appointment_modality"],"starts_at": string
            }[]
                           },
"has_care_access":
{ Args: { "p_doctor": string,"p_patient": string }; Returns: boolean
                           },
"has_documents_access":
{ Args: { "p_doctor": string,"p_patient": string }; Returns: boolean
                           },
"has_history_access":
{ Args: { "p_doctor": string,"p_patient": string }; Returns: boolean
                           },
"invite_patient":
{ Args: { "p_email": string }; Returns: undefined
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_pharmacy_member":
{ Args: { "p_pharmacy": string }; Returns: boolean
                           },
"is_pharmacy_owner":
{ Args: { "p_pharmacy": string }; Returns: boolean
                           },
"is_verified_doctor":
{ Args: { "p_doctor"?: string }; Returns: boolean
                           },
"log_patient_record_access":
{ Args: { "p_patient": string }; Returns: undefined
                           },
"mark_conversation_read":
{ Args: { "p_conversation": string }; Returns: undefined
                           },
"notify":
{ Args: { "p_body"?: string,"p_kind": string,"p_link"?: string,"p_title": string,"p_user": string }; Returns: undefined
                           },
"patient_cancel_appointment":
{ Args: { "p_id": string,"p_reason"?: string }; Returns: undefined
                           },
"patient_cancel_pharmacy_request":
{ Args: { "p_id": string }; Returns: undefined
                           },
"pharmacy_dispense":
{ Args: { "p_code": string,"p_notes"?: string,"p_pharmacist_crf": string,"p_pharmacist_name": string,"p_request"?: string }; Returns: string
                           },
"pharmacy_update_request":
{ Args: { "p_id": string,"p_note"?: string,"p_status": Database["public"]['Enums']["pharmacy_request_status"] }; Returns: undefined
                           },
"pharmacy_verify_prescription":
{ Args: { "p_code": string }; Returns: Json
                           },
"prescription_payload_for_pharmacy":
{ Args: { "p_rx": Omit<Database["public"]['Tables']["prescriptions"]['Row'], Database["public"]['Tables']["prescriptions"]['ComputedFields']> }; Returns: Json
                           },
"request_appointment":
{ Args: { "p_doctor": string,"p_modality": Database["public"]['Enums']["appointment_modality"],"p_reason": string,"p_share_documents"?: boolean,"p_share_history"?: boolean,"p_starts_at": string }; Returns: string
                           },
"require_role":
{ Args: { "p_role": Database["public"]['Enums']["user_role"] }; Returns: undefined
                           },
"reschedule_appointment":
{ Args: { "p_id": string,"p_new_start": string }; Returns: string
                           },
"respond_invitation":
{ Args: { "p_accept": boolean,"p_id": string,"p_share_documents"?: boolean,"p_share_history"?: boolean }; Returns: undefined
                           },
"return_prescription_to_draft":
{ Args: { "p_id": string }; Returns: undefined
                           },
"revoke_care":
{ Args: { "p_counterpart": string }; Returns: undefined
                           },
"search_doctors":
{ Args: { "p_city"?: string,"p_modality"?: Database["public"]['Enums']["appointment_modality"],"p_only_available"?: boolean,"p_query"?: string,"p_specialty"?: string }; Returns: {
              "accepting_new_patients": boolean,"bio": string,"city": string,"crm": string,"crm_state": string,"full_name": string,"id": string,"messaging_enabled": boolean,"modalities": (Database["public"]['Enums']["appointment_modality"])[],"next_slot": string,"rqe": string,"specialty": string,"state": string
            }[]
                           },
"search_pharmacies":
{ Args: { "p_lat"?: number,"p_lng"?: number,"p_query"?: string,"p_radius_km"?: number }; Returns: {
              "address_line": string,"city": string,"distance_km": number,"district": string,"has_inventory_data": boolean,"id": string,"latitude": number,"longitude": number,"matches": Json,"opening_hours": string,"phone": string,"state": string,"trade_name": string
            }[]
                           },
"start_conversation":
{ Args: { "p_counterpart": string,"p_subject"?: string }; Returns: string
                           },
"submit_prescription":
{ Args: { "p_id": string }; Returns: string
                           },
"update_care_consent":
{ Args: { "p_doctor": string,"p_share_documents": boolean,"p_share_history": boolean }; Returns: undefined
                           },
"write_audit":
{ Args: { "p_action": string,"p_entity_id": string,"p_entity_type": string,"p_metadata"?: Json,"p_subject"?: string }; Returns: undefined
                           }
          }
          Enums: {
            "appointment_modality": "in_person"|"telehealth","appointment_status": "requested"|"confirmed"|"completed"|"cancelled"|"no_show","care_status": "pending"|"active"|"revoked","dose_status": "taken"|"skipped","dsr_kind": "export"|"deletion"|"correction"|"access_report","dsr_status": "open"|"in_progress"|"completed"|"rejected","invitation_status": "pending"|"accepted"|"declined"|"expired","medication_source": "prescription"|"personal","medication_status": "active"|"paused"|"completed"|"discontinued","payment_status": "pending"|"paid"|"failed"|"refunded","pharmacy_member_role": "owner"|"pharmacist"|"attendant","pharmacy_request_status": "received"|"reviewing"|"awaiting_stock"|"preparing"|"ready"|"completed"|"cancelled","plan_audience": "patient"|"doctor"|"clinic"|"pharmacy","prescription_kind": "simple"|"antimicrobial"|"special_control","prescription_status": "draft"|"pending_signature"|"issued"|"dispensed"|"cancelled"|"expired","stock_status": "available"|"low"|"unavailable","subscription_status": "pending"|"trialing"|"active"|"past_due"|"canceled","ticket_status": "open"|"in_progress"|"resolved"|"closed","user_role": "patient"|"doctor"|"pharmacy"|"admin","verification_status": "not_submitted"|"under_review"|"approved"|"rejected"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "appointment_modality": ["in_person", "telehealth"],"appointment_status": ["requested", "confirmed", "completed", "cancelled", "no_show"],"care_status": ["pending", "active", "revoked"],"dose_status": ["taken", "skipped"],"dsr_kind": ["export", "deletion", "correction", "access_report"],"dsr_status": ["open", "in_progress", "completed", "rejected"],"invitation_status": ["pending", "accepted", "declined", "expired"],"medication_source": ["prescription", "personal"],"medication_status": ["active", "paused", "completed", "discontinued"],"payment_status": ["pending", "paid", "failed", "refunded"],"pharmacy_member_role": ["owner", "pharmacist", "attendant"],"pharmacy_request_status": ["received", "reviewing", "awaiting_stock", "preparing", "ready", "completed", "cancelled"],"plan_audience": ["patient", "doctor", "clinic", "pharmacy"],"prescription_kind": ["simple", "antimicrobial", "special_control"],"prescription_status": ["draft", "pending_signature", "issued", "dispensed", "cancelled", "expired"],"stock_status": ["available", "low", "unavailable"],"subscription_status": ["pending", "trialing", "active", "past_due", "canceled"],"ticket_status": ["open", "in_progress", "resolved", "closed"],"user_role": ["patient", "doctor", "pharmacy", "admin"],"verification_status": ["not_submitted", "under_review", "approved", "rejected"]
          }
        }
} as const
