import csv
import io
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.company import CompanyNode
from backend.app.models.campaign import UserTargetCampaign
from backend.app.models.user import User

router = APIRouter()


class CampaignSaveRequest(BaseModel):
    company_id: str = Field(..., description="ID of target company node")
    outreach_status: str = Field("CONTACTED", description="Status: NEW, CONTACTED, MEETING_BOOKED")
    custom_notes: Optional[str] = Field(None, description="Operator notes")


class LeadCreateRequest(BaseModel):
    company_id: str = Field(..., description="ID of target company node")
    status: str = Field("NEW", description="Lead status: NEW, CONTACTED, MEETING_BOOKED, CLOSED")
    notes: Optional[str] = None


class LeadUpdateRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class CampaignItemResponse(BaseModel):
    id: str
    name: str
    domain: Optional[str] = None
    hq_city: Optional[str] = None
    hq_country: Optional[str] = None
    industry: Optional[str] = None
    phone: Optional[str] = None
    contact_email: Optional[str] = None
    rating: Optional[float] = None
    lead_match_score: Optional[float] = None
    outreach_status: str
    top_gap: Optional[str] = None
    cold_outreach_subject: Optional[str] = None


@router.post("/save")
def save_campaign_target(
    payload: CampaignSaveRequest,
    db: Session = Depends(get_db),
):
    """Updates campaign outreach status and notes for a company node."""
    company = db.query(CompanyNode).filter(CompanyNode.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company node not found")

    company.outreach_status = payload.outreach_status
    company.updated_at = datetime.utcnow()

    # Also track in UserTargetCampaign if user exists
    user = db.query(User).first()
    if user:
        campaign_entry = (
            db.query(UserTargetCampaign)
            .filter(
                UserTargetCampaign.company_id == company.id,
                UserTargetCampaign.user_id == user.id,
            )
            .first()
        )
        if not campaign_entry:
            campaign_entry = UserTargetCampaign(
                user_id=user.id,
                company_id=company.id,
                outreach_status=payload.outreach_status,
                custom_notes=payload.custom_notes,
                last_contacted_at=datetime.utcnow() if payload.outreach_status != "NEW" else None,
            )
            db.add(campaign_entry)
        else:
            campaign_entry.outreach_status = payload.outreach_status
            if payload.custom_notes is not None:
                campaign_entry.custom_notes = payload.custom_notes
            if payload.outreach_status != "NEW":
                campaign_entry.last_contacted_at = datetime.utcnow()

    db.commit()
    db.refresh(company)

    return {
        "status": "SUCCESS",
        "message": f"Company {company.name} updated to {payload.outreach_status}",
        "company_id": str(company.id),
        "outreach_status": company.outreach_status,
        "lead_match_score": company.lead_match_score,
    }


# Standard REST endpoints: /api/leads, /api/leads/{id}
@router.post("/leads", response_model=Dict[str, Any])
def create_lead(payload: LeadCreateRequest, db: Session = Depends(get_db)):
    """Add a company to leads / CRM pipeline."""
    company = db.query(CompanyNode).filter(CompanyNode.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company.outreach_status = payload.status.upper()
    company.updated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "SUCCESS",
        "lead_id": str(company.id),
        "company_name": company.name,
        "outreach_status": company.outreach_status,
    }


@router.patch("/leads/{lead_id}", response_model=Dict[str, Any])
def update_lead(lead_id: str, payload: LeadUpdateRequest, db: Session = Depends(get_db)):
    """Update lead status or notes in CRM."""
    company = db.query(CompanyNode).filter(CompanyNode.id == lead_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Lead not found")

    if payload.status:
        company.outreach_status = payload.status.upper()
    company.updated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "SUCCESS",
        "lead_id": str(company.id),
        "company_name": company.name,
        "outreach_status": company.outreach_status,
    }


@router.get("", response_model=List[CampaignItemResponse])
def get_campaign_leads(
    status_filter: Optional[str] = Query(None, description="Filter by status: NEW, CONTACTED, MEETING_BOOKED"),
    db: Session = Depends(get_db),
):
    """Lists companies tracked in active lead generation campaigns."""
    query = db.query(CompanyNode)
    if status_filter:
        query = query.filter(CompanyNode.outreach_status == status_filter.upper())

    companies = query.order_by(CompanyNode.updated_at.desc()).all()
    results = []
    for c in companies:
        gaps = c.ai_gap_analysis.get("operational_issues", []) if isinstance(c.ai_gap_analysis, dict) else []
        pitch = c.pitch_strategy if isinstance(c.pitch_strategy, dict) else {}
        results.append(
            CampaignItemResponse(
                id=str(c.id),
                name=c.name,
                domain=c.domain,
                hq_city=c.hq_city,
                hq_country=c.hq_country,
                industry=c.industry,
                phone=c.phone,
                contact_email=c.contact_email,
                rating=c.rating,
                lead_match_score=c.lead_match_score or 80.0,
                outreach_status=c.outreach_status or "NEW",
                top_gap=gaps[0] if gaps else None,
                cold_outreach_subject=pitch.get("cold_outreach_subject"),
            )
        )
    return results


@router.get("/export")
@router.get("/export/csv")
def export_leads_csv(
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Exports structured lead generation dossier and AI gap pitches to CSV."""
    query = db.query(CompanyNode)
    if status_filter:
        query = query.filter(CompanyNode.outreach_status == status_filter.upper())

    companies = query.order_by(CompanyNode.lead_match_score.desc().nullslast()).all()

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Write CSV Header
    writer.writerow([
        "Company Name",
        "Domain",
        "HQ City",
        "HQ Country",
        "Physical Address",
        "Google Maps URL",
        "Industry",
        "Category",
        "Source",
        "Direct Phone",
        "Contact Email",
        "Google Rating",
        "Lead Match Score (%)",
        "Outreach Status",
        "Top Operational Bottleneck #1",
        "Critical Bottleneck #2",
        "Critical Bottleneck #3",
        "AI Strategic Angle",
        "Value Proposition",
        "Cold Outreach Subject",
        "Cold Email Template",
        "Phone Hook",
    ])

    for c in companies:
        gaps = c.ai_gap_analysis.get("operational_issues", []) if isinstance(c.ai_gap_analysis, dict) else []
        pitch = c.pitch_strategy if isinstance(c.pitch_strategy, dict) else {}

        writer.writerow([
            c.name,
            c.domain or "",
            c.hq_city or "",
            c.hq_country or "",
            c.hq_address or "",
            c.google_maps_url or "",
            c.industry or "",
            c.category or "",
            c.source or "",
            c.phone or "",
            c.contact_email or "",
            c.rating if c.rating is not None else "",
            f"{c.lead_match_score:.1f}%" if c.lead_match_score is not None else "80.0%",
            c.outreach_status or "NEW",
            gaps[0] if len(gaps) > 0 else "",
            gaps[1] if len(gaps) > 1 else "",
            gaps[2] if len(gaps) > 2 else "",
            pitch.get("tailored_angle", ""),
            pitch.get("value_proposition", ""),
            pitch.get("cold_outreach_subject", ""),
            pitch.get("email_body_template", ""),
            pitch.get("call_opening_hook", ""),
        ])

    csv_data = output.getvalue()
    filename = f"gods_eye_leads_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
